import React, { useState, useEffect } from 'react';
import { BatteryCharging, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CountdownTimerProps {
  endTimeIso: string;
  totalDurationMinutes: number;
  onComplete?: () => void;
  onStopEarly?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTimeIso,
  totalDurationMinutes,
  onComplete,
  onStopEarly,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const end = new Date(endTimeIso).getTime();
    return Math.max(0, Math.floor((end - Date.now()) / 1000));
  });

  useEffect(() => {
    const iv = setInterval(() => {
      const end  = new Date(endTimeIso).getTime();
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) {
        clearInterval(iv);
        try { confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } }); } catch {}
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [endTimeIso]);

  const totalSeconds    = totalDurationMinutes * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100));
  const minutes         = Math.floor(secondsLeft / 60);
  const seconds         = secondsLeft % 60;
  const formatted       = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  /* SVG circle maths */
  const R   = 80;          /* radius */
  const C   = 2 * Math.PI * R;   /* circumference ≈ 502 */
  const dash = C - (C * progressPercent) / 100;

  return (
    <div className="flex flex-col items-center bg-emerald-950/60 rounded-3xl border border-emerald-800/80 p-6 space-y-5 relative overflow-hidden">
      {/* ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-amber-500/5 to-teal-500/5 pointer-events-none animate-pulse" />

      {/* SVG ring */}
      <div className="relative w-52 h-52 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          {/* Track */}
          <circle cx="100" cy="100" r={R} fill="none" stroke="#065f46" strokeWidth="14" />
          {/* Progress */}
          <circle
            cx="100" cy="100" r={R}
            fill="none"
            stroke="#34d399"
            strokeWidth="14"
            strokeDasharray={C}
            strokeDashoffset={dash}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Centre */}
        <div className="absolute flex flex-col items-center text-center">
          <BatteryCharging className="w-9 h-9 text-amber-400 animate-pulse mb-1" />
          <span className="text-4xl font-black text-white font-mono tracking-wider">{formatted}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 mt-0.5">Remaining</span>
        </div>
      </div>

      {/* Linear progress bar */}
      <div className="w-full bg-emerald-900/80 rounded-full h-3 overflow-hidden border border-emerald-700/50">
        <div
          className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 h-full rounded-full transition-all duration-1000"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-sm text-emerald-200">
        <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{totalDurationMinutes} min session · {Math.round(progressPercent)}% done</span>
      </div>

      {/* Stop button */}
      {secondsLeft > 0 ? (
        onStopEarly && (
          <button
            id="stop-charging-btn"
            onClick={onStopEarly}
            className="w-full py-3.5 rounded-2xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" /> Stop Charging Early
          </button>
        )
      ) : (
        <div className="w-full flex items-center justify-center gap-2 text-emerald-300 bg-emerald-900/80 px-4 py-3 rounded-2xl border border-emerald-500/50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm">Charging Completed!</span>
        </div>
      )}
    </div>
  );
};
