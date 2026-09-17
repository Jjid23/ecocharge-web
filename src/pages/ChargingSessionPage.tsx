import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { ChargingSession } from '../types';
import { stopChargingSession, fetchActiveChargingSession } from '../services/api';
import { BatteryCharging, CheckCircle2, Zap, Clock, Sparkles, X } from 'lucide-react';
import { Footer } from '../components/Footer';

export const ChargingSessionPage: React.FC = () => {
  const { user, pageParams, activeSession, setCurrentPage, refreshUserData } = useAuth();
  const sessionFromParams: ChargingSession | undefined = pageParams?.activeSession;
  const currentSession = sessionFromParams || activeSession;

  const [sessionState, setSessionState] = useState<ChargingSession | null>(currentSession || null);
  const [completed, setCompleted]       = useState(false);
  const [stopping, setStopping]         = useState(false);
  const [stopResult, setStopResult]     = useState<{
    remainingSeconds: number;
    refundedPoints: number;
    resumable: boolean;
  } | null>(null);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  useEffect(() => {
    if (user && !sessionState) {
      fetchActiveChargingSession(user.userId).then((res) => {
        if (res.activeSession) setSessionState(res.activeSession);
      });
    }
  }, [user?.userId]);

  if (!user) return null;

  // ── Stop early (refunds unused points) ──────────────────────────
  const handleStopEarly = async () => {
    if (!sessionState) return;
    setStopping(true);
    setShowStopConfirm(false);
    try {
      const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      const res = await fetch(`${apiBase}/api/charging/stop/${sessionState.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ecocharge_token')}`
        }
      });
      const data = await res.json();
      setStopResult({
        remainingSeconds: data.remainingSeconds ?? 0,
        refundedPoints:   data.refundedPoints   ?? 0,
        resumable:        data.resumable         ?? false
      });
      await refreshUserData();
      setCompleted(true);
    } catch (err) { console.error(err); }
    finally { setStopping(false); }
  };

  const handleTimerComplete = async () => {
    setCompleted(true);
    await refreshUserData();
  };

  // ── Remaining seconds from timer ─────────────────────────────────
  const getRemainingNow = () => {
    if (!sessionState?.endTime) return 0;
    return Math.max(0, Math.floor((new Date(sessionState.endTime).getTime() - Date.now()) / 1000));
  };

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="px-4 py-5 space-y-5">

        {/* Status banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-amber-950 border-2 border-emerald-500/80 rounded-3xl p-5 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
            {completed
              ? <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              : <BatteryCharging className="w-7 h-7 animate-bounce" />}
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            {completed ? 'Session Ended' : 'Session Active'}
          </h1>
          <p className="text-xs text-emerald-200/80">
            {completed
              ? 'The port has been released.'
              : `Port #${sessionState?.portNumber ?? '—'} is delivering green-energy charge.`}
          </p>
        </div>

        {/* Timer */}
        {sessionState && !completed && (
          <CountdownTimer
            endTimeIso={sessionState.endTime}
            totalDurationMinutes={sessionState.durationMinutes}
            onComplete={handleTimerComplete}
            onStopEarly={() => setShowStopConfirm(true)}
          />
        )}

        {/* ── Stop confirmation modal ─────────────────────────── */}
        {showStopConfirm && sessionState && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
            <div className="bg-emerald-950 border border-emerald-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">Stop Session?</h3>
                <button onClick={() => setShowStopConfirm(false)} className="text-emerald-400 min-h-0 h-auto">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Show how many seconds are left + refund preview */}
              {(() => {
                const remSec  = getRemainingNow();
                const remMin  = Math.floor(remSec / 60);
                const remS    = remSec % 60;
                const refund  = Math.floor(remSec / 6); // 1 pt per 6 s
                return (
                  <div className="space-y-3">
                    <div className="bg-emerald-900/60 border border-emerald-700 rounded-xl p-3.5 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-300 flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> Time Remaining
                        </span>
                        <span className="font-black text-white">
                          {remMin}:{String(remS).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" /> Points Refunded
                        </span>
                        <span className="font-black text-amber-300">+{refund} PTS</span>
                      </div>
                    </div>

                    {remSec > 60 && (
                      <div className="text-xs text-teal-300 bg-teal-900/30 border border-teal-700/40 rounded-xl p-3">
                        💡 You have <strong>{remMin} min {remS}s</strong> left.
                        Stopping now will refund <strong>{refund} pts</strong> — you can use them to start a new session later.
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowStopConfirm(false)}
                  className="flex-1 py-3 rounded-2xl bg-emerald-900 border border-emerald-700 text-emerald-200 font-bold text-sm"
                >
                  Keep Charging
                </button>
                <button
                  onClick={handleStopEarly}
                  disabled={stopping}
                  className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-extrabold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {stopping ? 'Stopping…' : 'Stop & Refund'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Completion card ─────────────────────────────────── */}
        {completed && (
          <div className="space-y-4">
            <div className="bg-emerald-900/60 border border-emerald-700 rounded-3xl p-6 text-center space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
              <h2 className="text-xl font-black text-white">
                {stopResult?.remainingSeconds
                  ? 'Session Stopped Early'
                  : 'Charging Complete!'}
              </h2>
              <p className="text-xs text-emerald-200/80">
                {stopResult?.remainingSeconds
                  ? 'The port has been released and your unused points have been refunded.'
                  : 'Your device has been charged. The port has been released.'}
              </p>

              {/* Refund summary */}
              {stopResult && stopResult.refundedPoints > 0 && (
                <div className="bg-amber-900/30 border border-amber-700/40 rounded-2xl p-3.5 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-300">Time remaining</span>
                    <span className="font-black text-white">
                      {Math.floor(stopResult.remainingSeconds / 60)}m {stopResult.remainingSeconds % 60}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-300">Points refunded</span>
                    <span className="font-black text-amber-300">+{stopResult.refundedPoints} PTS</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-300">New balance</span>
                    <span className="font-black text-amber-300">{user.currentPoints} PTS</span>
                  </div>
                </div>
              )}
            </div>

            <button
              id="return-dashboard-completed-btn"
              onClick={() => setCurrentPage('dashboard')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-emerald-950 font-black text-base shadow-lg active:scale-95 transition-transform"
            >
              Return to Dashboard
            </button>

            <button
              onClick={() => setCurrentPage('port-selection')}
              className="w-full py-3.5 rounded-2xl bg-emerald-900/60 border border-emerald-700 text-emerald-200 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Zap className="w-4 h-4 text-amber-400" /> Start New Session
            </button>
          </div>
        )}

        {/* Session details */}
        {sessionState && (
          <div className="bg-emerald-900/40 border border-emerald-800/80 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-800 pb-2">
              Session Details
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Port',     val: `#${sessionState.portNumber}` },
                { label: 'Duration', val: `${sessionState.durationMinutes} mins` },
                { label: 'Cost',     val: `-${sessionState.pointsUsed} PTS`,    cls: 'text-amber-300' },
                { label: 'Status',   val: completed ? 'Ended' : 'Active',       cls: completed ? 'text-rose-400' : 'text-teal-300' },
              ].map(({ label, val, cls }) => (
                <div key={label} className="bg-emerald-950/80 p-2.5 rounded-xl border border-emerald-800">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">{label}</div>
                  <div className={`text-sm font-bold text-white ${cls ?? ''}`}>{val}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-emerald-400/80 pt-1">
              <span>Start: {new Date(sessionState.startTime).toLocaleTimeString()}</span>
              <span>End: {new Date(sessionState.endTime).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};
