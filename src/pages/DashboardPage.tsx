import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Leaf, Zap, Award, BatteryCharging, Clock, ArrowRight,
  TrendingUp, Sparkles, History, CheckCircle2, ChevronRight,
  Monitor, Bell, RefreshCw, PlusCircle, Activity, Info
} from 'lucide-react';
import {
  fetchRecyclingHistory, fetchChargingHistory,
  fetchPointsHistory, fetchChargingPorts,
  fetchResumableSessions, resumeSession, ResumableSession
} from '../services/api';
import { BottleTransaction, ChargingSession, PointTransaction, ChargingPort } from '../types';
import { ConsoleSidebar } from '../components/ConsoleSidebar';

export const DashboardPage: React.FC = () => {
  const { user, activeSession, setCurrentPage } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [recyclingLogs, setRecyclingLogs]     = useState<BottleTransaction[]>([]);
  const [chargingLogs, setChargingLogs]       = useState<ChargingSession[]>([]);
  const [pointLogs, setPointLogs]             = useState<PointTransaction[]>([]);
  const [portsList, setPortsList]             = useState<ChargingPort[]>([]);
  const [resumableSessions, setResumableSessions] = useState<ResumableSession[]>([]);
  const [resuming, setResuming]               = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [depositSearch, setDepositSearch]   = useState('');
  const [chargingSearch, setChargingSearch] = useState('');
  const [ledgerSearch, setLedgerSearch]     = useState('');

  const loadUserData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [rRes, cRes, pRes, portRes, resumeRes] = await Promise.all([
        fetchRecyclingHistory(user.userId),
        fetchChargingHistory(user.userId),
        fetchPointsHistory(user.userId),
        fetchChargingPorts(),
        fetchResumableSessions(user.userId),
      ]);
      setRecyclingLogs(rRes.transactions);
      setChargingLogs(cRes.sessions);
      setPointLogs(pRes.transactions);
      setPortsList(portRes.ports);
      setResumableSessions(resumeRes.resumableSessions ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUserData(); }, [user?.userId]);
  if (!user) return null;

  const handleSelectTab = (tabId: string) => {
    if (['bottle-detection', 'port-selection', 'charging-session', 'profile'].includes(tabId)) {
      setCurrentPage(tabId);
    } else {
      setActiveTab(tabId);
    }
  };

  /* Totals */
  const totalBottles        = recyclingLogs.reduce((a, b) => a + b.quantity, 0);
  const totalChargingMins   = chargingLogs.reduce((a, c) => a + c.durationMinutes, 0);
  const totalChargingSessions = chargingLogs.length;

  /* Eco level */
  let ecoLevel = 'Eco Starter';
  let nextTierBottles = 10;
  if (totalBottles >= 20)      { ecoLevel = 'Planet Protector'; nextTierBottles = 50; }
  else if (totalBottles >= 10) { ecoLevel = 'Green Champion';   nextTierBottles = 20; }
  const levelProgress = Math.min(100, Math.round((totalBottles / nextTierBottles) * 100));

  /* Combined recent activity */
  const recentActivities = [
    ...recyclingLogs.map((b) => ({
      id: b.transactionId, type: 'recycling' as const,
      title: `Recycled ${b.quantity}× ${b.bottleSize.toUpperCase()}`,
      pts: `+${b.pointsEarned}`, date: b.detectedAt, icon: Leaf,
      badge: 'text-emerald-400 bg-emerald-950 border-emerald-800',
    })),
    ...chargingLogs.map((c) => ({
      id: c.sessionId, type: 'charging' as const,
      title: `Charged on Port ${c.portNumber}`,
      pts: `-${c.pointsUsed}`, date: c.startTime, icon: BatteryCharging,
      badge: 'text-amber-400 bg-amber-950 border-amber-800',
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  /* ── Kiosk list mock ── */
  const kiosksList = [
    { id: 'k1', name: 'Kiosk Unit 01', location: 'Lobby A', status: 'Online',      binPct: 42 },
    { id: 'k2', name: 'Kiosk Unit 02', location: 'Food Court', status: 'Online',   binPct: 78 },
  ];

  /* ── Ports for kiosk tab ── */
  const availablePorts = portsList.filter(
    (p) => p.portStatus?.toLowerCase() === 'available'
  );

  /* ─────────────────────── RENDER ──────────────────────────── */
  const renderTab = () => {
    switch (activeTab) {

      /* ── DASHBOARD ──────────────────────────────────────────── */
      case 'dashboard':
      default:
        return (
          <div className="px-4 py-5 space-y-5">
            {/* User greeting */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-950 border border-emerald-800 rounded-3xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-emerald-950 flex items-center justify-center font-black text-xl shrink-0">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-black text-white truncate">Hey, {user.fullName.split(' ')[0]}!</div>
                <div className="text-xs text-emerald-300">@{user.username}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold uppercase text-emerald-400">Balance</div>
                <div className="text-lg font-black text-amber-300">{user.currentPoints} <span className="text-xs">PTS</span></div>
              </div>
            </div>

            {/* Active session banner */}
            {activeSession && (
              <button
                onClick={() => setCurrentPage('charging-session')}
                className="w-full bg-amber-500/20 border-2 border-amber-400/60 rounded-2xl p-3.5 flex items-center gap-3 active:scale-95 transition-transform"
              >
                <BatteryCharging className="w-6 h-6 text-amber-400 animate-pulse shrink-0" />
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold text-amber-300">Active Charging Session</div>
                  <div className="text-[11px] text-amber-200/80">Port {activeSession.portNumber} · Tap to view</div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
              </button>
            )}

            {/* Resumable sessions banner */}
            {!activeSession && resumableSessions.length > 0 && resumableSessions.map((rs) => (
              <div
                key={rs.sessionId}
                className="w-full bg-teal-900/40 border-2 border-teal-500/60 rounded-2xl p-3.5 flex items-center gap-3"
              >
                <Clock className="w-6 h-6 text-teal-400 shrink-0" />
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold text-teal-300">
                    {rs.remainingMinutes} min remaining from previous session
                  </div>
                  <div className="text-[11px] text-teal-200/70">
                    {rs.pointsRefunded} pts refunded · tap Resume to use them
                  </div>
                </div>
                <button
                  disabled={resuming}
                  onClick={async () => {
                    setResuming(true);
                    try {
                      const res = await resumeSession(rs.sessionId);
                      setCurrentPage('charging-session', {
                        activeSession: res.session,
                        port: res.port,
                      });
                    } catch (err: any) {
                      alert(err.message);
                    } finally {
                      setResuming(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-teal-500 text-teal-950 font-extrabold text-xs shrink-0 disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {resuming ? '…' : 'Resume'}
                </button>
              </div>
            ))}

            {/* Stat cards row */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Bottles',  val: totalBottles,        icon: Leaf,           color: 'text-emerald-400 bg-emerald-500/20' },
                { label: 'Sessions', val: totalChargingSessions, icon: BatteryCharging, color: 'text-amber-400 bg-amber-500/20' },
                { label: 'Mins',     val: totalChargingMins,   icon: Clock,          color: 'text-teal-400 bg-teal-500/20' },
              ].map(({ label, val, icon: Icon, color }) => (
                <div key={label} className="bg-emerald-900/40 border border-emerald-800/80 rounded-2xl p-3 flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-black text-white">{val}</div>
                  <div className="text-[10px] font-bold uppercase text-emerald-400">{label}</div>
                </div>
              ))}
            </div>

            {/* Eco level progress */}
            <div className="bg-emerald-900/40 border border-emerald-800/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300">{ecoLevel}</span>
                <span className="text-emerald-400">{levelProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-emerald-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <div className="text-[11px] text-emerald-400/80">
                {totalBottles} / {nextTierBottles} bottles to next tier
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCurrentPage('bottle-detection')}
                className="bg-emerald-500 text-emerald-950 rounded-2xl p-4 flex flex-col items-center gap-2 font-bold text-sm active:scale-95 transition-transform shadow-lg"
              >
                <Leaf className="w-7 h-7 fill-current" />
                Recycle Bottle
              </button>
              <button
                onClick={() => setCurrentPage('port-selection')}
                className="bg-amber-400 text-amber-950 rounded-2xl p-4 flex flex-col items-center gap-2 font-bold text-sm active:scale-95 transition-transform shadow-lg"
              >
                <Zap className="w-7 h-7 fill-current" />
                Charge Device
              </button>
            </div>

            {/* Recent activity */}
            {recentActivities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Recent Activity</span>
                  <button onClick={() => setActiveTab('ledger')} className="text-[11px] text-emerald-400 hover:text-white min-h-0 h-auto py-0">View all</button>
                </div>
                <div className="space-y-2">
                  {recentActivities.map((a) => {
                    const Icon = a.icon;
                    return (
                      <div key={a.id} className="bg-emerald-900/30 border border-emerald-800/60 rounded-xl p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${a.badge}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{a.title}</div>
                          <div className="text-[10px] text-emerald-400/80">
                            {new Date(a.date).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`text-xs font-extrabold shrink-0 ${a.type === 'recycling' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {a.pts} PTS
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      /* ── KIOSKS TAB ──────────────────────────────────────────── */
      case 'kiosks':
        return (
          <div className="px-4 py-5 space-y-4">
            <h2 className="text-base font-black text-white">Kiosks &amp; Ports</h2>
            {kiosksList.map((k) => (
              <div key={k.id} className="bg-emerald-900/40 border border-emerald-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">{k.name}</div>
                    <div className="text-xs text-emerald-400">{k.location}</div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {k.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-emerald-300">
                    <span>Bin Capacity</span><span>{k.binPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-emerald-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${k.binPct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${k.binPct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <h3 className="text-sm font-bold text-emerald-300 pt-2">Available Charging Ports</h3>
            {availablePorts.length === 0 ? (
              <div className="text-xs text-emerald-400/60 text-center py-6">No ports available right now.</div>
            ) : (
              <div className="space-y-2">
                {availablePorts.map((p) => (
                  <button
                    key={p.portId}
                    onClick={() => setCurrentPage('port-selection')}
                    className="w-full bg-emerald-900/40 border border-emerald-700 rounded-2xl p-3.5 flex items-center justify-between active:scale-95 transition-transform"
                  >
                    <div>
                      <div className="text-sm font-bold text-white text-left">Port #{p.portNumber}</div>
                      <div className="text-xs text-emerald-400">{p.connectorType}</div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Available
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      /* ── ALERTS TAB ──────────────────────────────────────────── */
      case 'alerts':
        return (
          <div className="px-4 py-5 space-y-3">
            <h2 className="text-base font-black text-white">Alerts &amp; Tips</h2>
            {[
              { type: 'tip',   title: 'Earn faster!',        msg: 'Large bottles earn 15 pts — 3× more than small!', color: 'border-emerald-600 bg-emerald-900/40' },
              { type: 'info',  title: 'Stay charged',        msg: 'Select your charging port before your session ends.', color: 'border-teal-600 bg-teal-950/40' },
              { type: 'alert', title: 'Points expiry',       msg: 'Unused points remain valid indefinitely.', color: 'border-amber-600 bg-amber-950/30' },
            ].map(({ title, msg, color }) => (
              <div key={title} className={`border rounded-2xl p-4 space-y-1 ${color}`}>
                <div className="text-sm font-bold text-white">{title}</div>
                <div className="text-xs text-emerald-200/80 leading-snug">{msg}</div>
              </div>
            ))}
          </div>
        );

      /* ── BOTTLE DEPOSITS ─────────────────────────────────────── */
      case 'recycling-history':
        const filteredRecycling = recyclingLogs.filter((t) =>
          t.bottleType.toLowerCase().includes(depositSearch.toLowerCase()) ||
          t.bottleSize.toLowerCase().includes(depositSearch.toLowerCase())
        );
        return (
          <div className="px-4 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Bottle Deposits</h2>
              <span className="text-xs text-emerald-400">{filteredRecycling.length} records</span>
            </div>
            <input
              type="text" placeholder="Search by type or size…"
              value={depositSearch} onChange={(e) => setDepositSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 text-sm focus:outline-none focus:border-emerald-400"
            />
            <div className="space-y-2">
              {filteredRecycling.length === 0 ? (
                <div className="text-xs text-emerald-400/60 text-center py-8">No deposits yet.</div>
              ) : filteredRecycling.map((t) => (
                <div key={t.transactionId} className="bg-emerald-900/30 border border-emerald-800/60 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-700 flex items-center justify-center shrink-0">
                    <Leaf className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white capitalize">{t.bottleSize} · {t.bottleType}</div>
                    <div className="text-[10px] text-emerald-400/80">
                      {new Date(t.detectedAt).toLocaleDateString()} · Qty: {t.quantity}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400 shrink-0">+{t.pointsEarned} PTS</span>
                </div>
              ))}
            </div>
          </div>
        );

      /* ── CHARGING LOG ────────────────────────────────────────── */
      case 'charging-history':
        const filteredCharging = chargingLogs.filter((s) =>
          String(s.portNumber).includes(chargingSearch) ||
          s.sessionStatus.toLowerCase().includes(chargingSearch.toLowerCase())
        );
        return (
          <div className="px-4 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Charging Log</h2>
              <span className="text-xs text-emerald-400">{filteredCharging.length} sessions</span>
            </div>
            <input
              type="text" placeholder="Search by port or status…"
              value={chargingSearch} onChange={(e) => setChargingSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 text-sm focus:outline-none focus:border-emerald-400"
            />
            <div className="space-y-2">
              {filteredCharging.length === 0 ? (
                <div className="text-xs text-emerald-400/60 text-center py-8">No sessions yet.</div>
              ) : filteredCharging.map((s) => (
                <div key={s.sessionId} className="bg-emerald-900/30 border border-emerald-800/60 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-700/50 flex items-center justify-center shrink-0">
                    <BatteryCharging className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">Port #{s.portNumber} · {s.durationMinutes} mins</div>
                    <div className="text-[10px] text-emerald-400/80">
                      {new Date(s.startTime).toLocaleDateString()} · {s.sessionStatus}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-amber-400 shrink-0">-{s.pointsUsed} PTS</span>
                </div>
              ))}
            </div>
          </div>
        );

      /* ── CREDIT LEDGER ───────────────────────────────────────── */
      case 'ledger':
        const filteredLedger = pointLogs.filter((p) =>
          p.description?.toLowerCase().includes(ledgerSearch.toLowerCase())
        );
        return (
          <div className="px-4 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Credit Ledger</h2>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-extrabold text-amber-300">{user.currentPoints} PTS</span>
              </div>
            </div>
            <input
              type="text" placeholder="Search transactions…"
              value={ledgerSearch} onChange={(e) => setLedgerSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 text-sm focus:outline-none focus:border-emerald-400"
            />
            <div className="space-y-2">
              {filteredLedger.length === 0 ? (
                <div className="text-xs text-emerald-400/60 text-center py-8">No point transactions yet.</div>
              ) : filteredLedger.map((p) => {
                const shift = p.pointsAdded > 0 ? p.pointsAdded : -p.pointsDeducted;
                const isCredit = shift > 0;
                return (
                  <div key={p.pointTransactionId} className="bg-emerald-900/30 border border-emerald-800/60 rounded-xl p-3.5 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-500/20 border border-emerald-700' : 'bg-amber-500/20 border border-amber-700/50'}`}>
                      {isCredit ? <Leaf className="w-4 h-4 text-emerald-400" /> : <Zap className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{p.description || (isCredit ? 'Points Earned' : 'Points Used')}</div>
                      <div className="text-[10px] text-emerald-400/80">{new Date(p.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span className={`text-xs font-extrabold shrink-0 ${isCredit ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isCredit ? '+' : ''}{shift} PTS
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-emerald-950">
      <ConsoleSidebar
        currentTab={activeTab}
        onSelectTab={handleSelectTab}
        mode="user"
      />
      {/* Scrollable content area with bottom nav offset */}
      <div className="flex-1 overflow-y-auto mb-nav kiosk-scroll">
        {renderTab()}
      </div>
    </div>
  );
};
