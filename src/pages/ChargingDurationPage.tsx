import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChargingPort } from '../types';
import { Zap, AlertCircle, Sparkles, Clock, Leaf } from 'lucide-react';
import { startChargingSession } from '../services/api';
import { Footer } from '../components/Footer';

const DURATION_OPTIONS = [
  { minutes: 5,  points: 10 },
  { minutes: 10, points: 20 },
  { minutes: 15, points: 30 },
  { minutes: 20, points: 40 },
  { minutes: 30, points: 60 },
];

export const ChargingDurationPage: React.FC = () => {
  const { user, pageParams, setCurrentPage, refreshUserData } = useAuth();
  const selectedPort: ChargingPort | undefined = pageParams?.selectedPort;

  const [selectedDuration, setSelectedDuration] = useState(15);
  const [submitting, setSubmitting]             = useState(false);
  const [errorMsg, setErrorMsg]                 = useState<string | null>(null);

  if (!user) return null;

  if (!selectedPort) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center gap-4">
        <AlertCircle className="w-12 h-12 text-amber-400" />
        <h2 className="text-lg font-bold text-white">No Port Selected</h2>
        <p className="text-xs text-emerald-300">Please select an available charging port first.</p>
        <button
          onClick={() => setCurrentPage('port-selection')}
          className="px-6 py-3.5 rounded-2xl bg-emerald-500 text-emerald-950 font-bold text-sm active:scale-95 transition-transform"
        >
          Select Port
        </button>
      </div>
    );
  }

  const selectedOpt    = DURATION_OPTIONS.find((o) => o.minutes === selectedDuration) ?? { minutes: selectedDuration, points: selectedDuration * 2 };
  const requiredPoints = selectedOpt.points;
  const remaining      = user.currentPoints - requiredPoints;
  const hasEnough      = user.currentPoints >= requiredPoints;

  const handleStart = async () => {
    if (!hasEnough) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await startChargingSession({ userId: user.userId, portId: selectedPort.portId, durationMinutes: selectedDuration });
      await refreshUserData();
      setCurrentPage('charging-session', { activeSession: res.session, port: res.port });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="px-4 py-5 space-y-5">

        {/* Selected port header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-amber-950 border border-emerald-800 rounded-3xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-black text-white">Select Duration</h1>
            <p className="text-xs text-emerald-200/80">
              Port #{selectedPort.portNumber} · {selectedPort.connectorType}
            </p>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/60 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-extrabold text-amber-300">{user.currentPoints}</span>
          </div>
        </div>

        {/* Duration grid */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
            <Clock className="w-4 h-4" /> Choose Charging Duration
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DURATION_OPTIONS.map((opt) => {
              const isSelected = selectedDuration === opt.minutes;
              return (
                <button
                  key={opt.minutes}
                  id={`duration-opt-${opt.minutes}`}
                  onClick={() => setSelectedDuration(opt.minutes)}
                  className={`py-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/30 to-emerald-900 border-amber-400 ring-2 ring-amber-400/30'
                      : 'bg-emerald-900/40 border-emerald-800 hover:bg-emerald-900/70'
                  }`}
                >
                  <div className="text-sm font-black text-white leading-none">{opt.minutes}</div>
                  <div className="text-[9px] text-emerald-300 font-semibold">min</div>
                  <div className="text-[10px] font-bold text-amber-300">{opt.points}pt</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-emerald-900/50 border border-emerald-800 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-800 pb-2">
            Session Summary
          </div>
          {[
            { label: 'Your Balance',    val: `${user.currentPoints} pts`,                cls: 'text-white' },
            { label: 'Port',            val: `#${selectedPort.portNumber}`,              cls: 'text-white' },
            { label: 'Duration',        val: `${selectedDuration} minutes`,              cls: 'text-white' },
            { label: 'Cost',            val: `-${requiredPoints} pts`,                   cls: 'text-amber-300 font-extrabold' },
          ].map(({ label, val, cls }) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-emerald-300">{label}</span>
              <span className={cls}>{val}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm pt-2 border-t border-emerald-800">
            <span className="font-bold text-emerald-200">Remaining after:</span>
            <span className={`font-black ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{remaining} pts</span>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* CTA */}
        {!hasEnough ? (
          <div className="bg-rose-950/90 border-2 border-rose-600 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Insufficient Points</div>
                <div className="text-xs text-rose-200 mt-0.5">You need {requiredPoints - user.currentPoints} more points for this duration.</div>
              </div>
            </div>
            <button
              id="recycle-more-bottles-btn"
              onClick={() => setCurrentPage('bottle-detection')}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-emerald-950 font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Leaf className="w-4 h-4 fill-current" /> Recycle More Bottles
            </button>
          </div>
        ) : (
          <button
            id="confirm-start-charging-btn"
            onClick={handleStart}
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 font-black text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
          >
            <Zap className="w-5 h-5 fill-current" />
            {submitting ? 'Activating Port...' : 'Start Charging Session'}
          </button>
        )}
      </div>

      <Footer />
    </div>
  );
};
