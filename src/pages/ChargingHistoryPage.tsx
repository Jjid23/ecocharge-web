import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchChargingHistory } from '../services/api';
import { ChargingSession } from '../types';
import { BatteryCharging, Search, Filter, Zap, CheckCircle2, AlertOctagon } from 'lucide-react';
import { Footer } from '../components/Footer';

export const ChargingHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions]       = useState<ChargingSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchChargingHistory(user.userId)
        .then((res) => setSessions(res.sessions))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user?.userId]);

  if (!user) return null;

  const filtered = sessions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = s.sessionId.toLowerCase().includes(q) ||
      String(s.portNumber).includes(q) ||
      (s.connectorType || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.sessionStatus.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalMins = filtered.reduce((a, s) => a + s.durationMinutes, 0);
  const totalPts  = filtered.reduce((a, s) => a + s.pointsUsed, 0);

  const statusConfig: Record<string, { label: string; cls: string; Icon: any }> = {
    Active:    { label: 'Active',    cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',   Icon: Zap },
    Completed: { label: 'Completed', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', Icon: CheckCircle2 },
    Stopped:   { label: 'Stopped',   cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40',      Icon: AlertOctagon },
  };

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="px-4 py-5 space-y-4">

        {/* Header summary */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-amber-950 border border-emerald-800 rounded-3xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center shrink-0">
              <BatteryCharging className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-base font-black text-white">Charging History</h1>
              <p className="text-xs text-emerald-200/80">All your device charging sessions</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-950/80 rounded-xl p-2.5 border border-emerald-800 text-center">
              <div className="text-[10px] font-bold uppercase text-emerald-400">Total Time</div>
              <div className="text-lg font-black text-teal-300">{totalMins} min</div>
            </div>
            <div className="bg-emerald-950/80 rounded-xl p-2.5 border border-emerald-800 text-center">
              <div className="text-[10px] font-bold uppercase text-emerald-400">Points Spent</div>
              <div className="text-lg font-black text-amber-300">-{totalPts}</div>
            </div>
          </div>
        </div>

        {/* Search + filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="charging-search-input"
              type="text"
              placeholder="Search by session ID or port…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex gap-2 flex-1">
              {[
                { val: 'all',       label: 'All' },
                { val: 'active',    label: 'Active' },
                { val: 'completed', label: 'Done' },
                { val: 'stopped',   label: 'Stopped' },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all min-h-0 h-auto ${
                    statusFilter === val
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-950/60 border border-emerald-800 text-emerald-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Session list */}
        {loading ? (
          <div className="text-center py-10 text-xs text-emerald-400/60">Loading sessions…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-emerald-400/60">No sessions match your search.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const cfg = statusConfig[s.sessionStatus] ?? statusConfig['Completed'];
              const Icon = cfg.Icon;
              return (
                <div key={s.sessionId} className="bg-emerald-900/30 border border-emerald-800/60 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-700/50 flex items-center justify-center shrink-0">
                    <BatteryCharging className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">
                      Port #{s.portNumber} · {s.durationMinutes} mins
                    </div>
                    <div className="text-[11px] text-emerald-400/80 mt-0.5">
                      {new Date(s.startTime).toLocaleDateString()} {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {s.connectorType ? ` · ${s.connectorType}` : ''}
                    </div>
                    <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-amber-400">-{s.pointsUsed}</div>
                    <div className="text-[10px] text-emerald-500 uppercase font-bold">PTS</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};
