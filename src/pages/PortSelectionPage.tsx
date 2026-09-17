import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchChargingPorts } from '../services/api';
import { ChargingPort } from '../types';
import { Zap, CheckCircle2, AlertOctagon, Wrench, Sparkles, RefreshCw } from 'lucide-react';
import { Footer } from '../components/Footer';

export const PortSelectionPage: React.FC = () => {
  const { user, setCurrentPage } = useAuth();
  const [ports, setPorts]               = useState<ChargingPort[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);

  // Use a ref to track selection so the interval closure always sees the latest value
  const selectedRef = useRef<string | null>(null);
  const handleSelect = (id: string) => {
    selectedRef.current = id;
    setSelectedPortId(id);
  };

  const loadPorts = async (isFirst = false) => {
    setLoading(true);
    try {
      const res = await fetchChargingPorts();
      // Sort by port number so order is always stable
      const sorted = [...res.ports].sort((a, b) => a.portNumber - b.portNumber);
      setPorts(sorted);
      // Only auto-select on first load and only if nothing is selected yet
      if (isFirst && !selectedRef.current) {
        const avail = sorted.find((p) => p.portStatus?.toLowerCase() === 'available');
        if (avail) {
          selectedRef.current = avail.portId;
          setSelectedPortId(avail.portId);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadPorts(true);
    const iv = setInterval(() => loadPorts(false), 5000);
    return () => clearInterval(iv);
  }, []);

  if (!user) return null;

  const handleContinue = () => {
    if (!selectedPortId) return;
    const chosen = ports.find((p) => p.portId === selectedPortId);
    if (!chosen || chosen.portStatus?.toLowerCase() !== 'available') return;
    setCurrentPage('charging-duration', { selectedPort: chosen });
  };

  const selectedPort = ports.find((p) => p.portId === selectedPortId);

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="px-4 py-5 space-y-5">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-amber-950 border border-emerald-800 rounded-3xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-black text-white">Select Charging Port</h1>
            <p className="text-xs text-emerald-200/80">Choose an available port to proceed</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/60 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-extrabold text-amber-300">{user.currentPoints} PTS</span>
          </div>
        </div>

        {/* Refresh row */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            {ports.filter((p) => p.portStatus?.toLowerCase() === 'available').length} port(s) available
          </span>
          <button
            onClick={() => loadPorts(false)}
            className="p-1.5 rounded-lg text-emerald-400 hover:text-white min-h-0 h-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Port cards */}
        <div className="flex flex-col gap-3">
          {ports.map((port) => {
            const status      = port.portStatus?.toLowerCase() ?? '';
            const isAvailable = status === 'available';
            const isInUse     = status === 'in use' || status === 'occupied';
            const isMaint     = status === 'maintenance' || status === 'disabled';
            const isSelected  = selectedPortId === port.portId;

            return (
              <div
                key={port.portId}
                id={`port-card-${port.portNumber}`}
                onClick={() => { if (isAvailable) handleSelect(port.portId); }}
                className={`rounded-2xl p-4 border-2 transition-all ${
                  isAvailable
                    ? isSelected
                      ? 'bg-gradient-to-r from-emerald-900 to-emerald-950 border-amber-400 ring-2 ring-amber-400/30 cursor-pointer'
                      : 'bg-emerald-900/40 border-emerald-700/80 hover:border-emerald-500 cursor-pointer active:scale-95'
                    : 'bg-emerald-950/60 border-emerald-900 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-black text-white">Port #{port.portNumber}</span>

                  {isAvailable && (
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Available
                    </span>
                  )}
                  {isInUse && (
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" /> In Use
                    </span>
                  )}
                  {isMaint && (
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> Maintenance
                    </span>
                  )}
                </div>

                {/* Connector type only — no "Updated" timestamp */}
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-amber-400 border-amber-400 text-amber-950'
                        : 'bg-emerald-900 border-emerald-700 text-emerald-400'
                    }`}>
                    {isAvailable && (isSelected
                      ? <CheckCircle2 className="w-5 h-5" />
                      : <Zap className="w-4 h-4" />)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue CTA */}
        <div className="sticky bottom-4">
          {selectedPort && (
            <div className="text-xs text-emerald-300 text-center mb-2">
              Selected: <strong className="text-white">Port #{selectedPort.portNumber}</strong>
            </div>
          )}
          <button
            id="continue-to-duration-btn"
            onClick={handleContinue}
            disabled={!selectedPortId}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 text-emerald-950 font-black text-base shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
          >
            Continue to Duration →
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};
