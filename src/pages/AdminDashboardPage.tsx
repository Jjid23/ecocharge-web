import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminStats, fetchAdminUsers, updateAdminUserPoints,
  updateAdminPortStatus, fetchAdminSettings, updateAdminSettings,
  fetchAdminRecyclingLogs, fetchAdminChargingLogs, fetchChargingPorts
} from '../services/api';
import { User, ChargingPort, SystemSettings, BottleTransaction, ChargingSession, PortStatus } from '../types';
import {
  ShieldCheck, Users, Leaf, Award, Zap, BatteryCharging,
  Settings, BarChart3, Search, CheckCircle2, Wrench,
  AlertOctagon, Edit2, RefreshCw, TrendingUp, Sparkles,
  Clock, Check, X, AlertTriangle, Info
} from 'lucide-react';
import { ConsoleSidebar } from '../components/ConsoleSidebar';
import { KioskPage } from './KioskPage';

export const AdminDashboardPage: React.FC = () => {
  const { user, setCurrentPage } = useAuth();
  const [activeTab, setActiveTab]           = useState('dashboard');
  const [consoleMode, setConsoleMode]       = useState<'admin' | 'user'>('admin');

  const [stats, setStats]                   = useState<any>(null);
  const [usersList, setUsersList]           = useState<User[]>([]);
  const [portsList, setPortsList]           = useState<ChargingPort[]>([]);
  const [sysSettings, setSysSettings]       = useState<SystemSettings | null>(null);
  const [recyclingLogs, setRecyclingLogs]   = useState<BottleTransaction[]>([]);
  const [chargingLogs, setChargingLogs]     = useState<ChargingSession[]>([]);

  const [userSearch, setUserSearch]         = useState('');
  const [depositSearch, setDepositSearch]   = useState('');
  const [chargingSearch, setChargingSearch] = useState('');

  const [selectedUserForPoints, setSelectedUserForPoints] = useState<User | null>(null);
  const [pointsAdjInput, setPointsAdjInput]   = useState(50);
  const [pointsAdjReason, setPointsAdjReason] = useState('Bonus Eco Reward');
  const [rateSmall, setRateSmall]             = useState(5);
  const [rateMedium, setRateMedium]           = useState(10);
  const [rateLarge, setRateLarge]             = useState(15);
  const [rateSavedMsg, setRateSavedMsg]       = useState<string | null>(null);
  const [toast, setToast]                     = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const [ratesInitialised, setRatesInitialised] = useState(false);

  const loadAll = async (isInitial = false) => {
    try {
      const [sRes, uRes, pRes, setRes, rRes, cRes] = await Promise.all([
        fetchAdminStats(), fetchAdminUsers(), fetchChargingPorts(),
        fetchAdminSettings(), fetchAdminRecyclingLogs(), fetchAdminChargingLogs(),
      ]);
      setStats(sRes.stats);
      setUsersList(uRes.users);
      setPortsList(pRes.ports);
      setSysSettings(setRes.settings);
      // Only overwrite rate inputs on first load — after that the user owns them
      if (isInitial && !ratesInitialised) {
        setRateSmall(setRes.settings.smallBottlePoints);
        setRateMedium(setRes.settings.mediumBottlePoints);
        setRateLarge(setRes.settings.largeBottlePoints);
        setRatesInitialised(true);
      }
      setRecyclingLogs(rRes.transactions);
      setChargingLogs(cRes.sessions);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadAll(true);
    const iv = setInterval(() => loadAll(false), 6000);
    return () => clearInterval(iv);
  }, []);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center gap-4">
        <ShieldCheck className="w-14 h-14 text-rose-400" />
        <h2 className="text-xl font-bold text-white">Admin Access Required</h2>
        <p className="text-xs text-emerald-300">You must be signed in as an administrator.</p>
        <button
          onClick={() => setCurrentPage('signin')}
          className="px-6 py-3.5 rounded-2xl bg-amber-400 text-amber-950 font-bold text-sm active:scale-95 transition-transform"
        >
          Sign In as Admin
        </button>
      </div>
    );
  }

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPoints) return;
    try {
      await updateAdminUserPoints(selectedUserForPoints.userId, pointsAdjInput, pointsAdjReason);
      setSelectedUserForPoints(null);
      showToast('Points adjusted successfully.');
      await loadAll(false);
    } catch (err) { console.error(err); }
  };

  const handlePortStatusChange = async (portId: string, status: PortStatus) => {
    try {
      await updateAdminPortStatus(portId, status);
      showToast('Port status updated.');
      await loadAll(false);
    } catch (err) { console.error(err); }
  };

  const handleSaveRates = async () => {
    if (!sysSettings) return;
    try {
      await updateAdminSettings({ ...sysSettings, smallBottlePoints: rateSmall, mediumBottlePoints: rateMedium, largeBottlePoints: rateLarge });
      showToast('Rates saved!');
      await loadAll(false);
    } catch (err) { console.error(err); }
  };

  const handleToggleMode = () => {
    if (consoleMode === 'admin') {
      setConsoleMode('user');
      setActiveTab('dashboard');
    } else {
      setConsoleMode('admin');
      setActiveTab('dashboard');
    }
  };

  /* ── TAB SELECT ─────────────────────────────────────────── */
  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  /* ─────────────────────── RENDER ──────────────────────────── */
  const renderTab = () => {
    switch (activeTab) {

      /* ── OVERVIEW ───────────────────────────────────────────── */
      case 'dashboard':
      default:
        return (
          <div className="px-4 py-5 space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Users',     val: stats?.totalRegisteredUsers ?? '—', icon: Users,           color: 'text-teal-400 bg-teal-500/20' },
                { label: 'Bottles',   val: stats?.totalBottlesRecycled  ?? '—', icon: Leaf,            color: 'text-emerald-400 bg-emerald-500/20' },
                { label: 'Sessions',  val: stats?.totalChargingSessions ?? '—', icon: BatteryCharging, color: 'text-amber-400 bg-amber-500/20' },
                { label: 'Pts Given', val: stats?.totalPointsAwarded    ?? '—', icon: Award,           color: 'text-yellow-400 bg-yellow-500/20' },
              ].map(({ label, val, icon: Icon, color }) => (
                <div key={label} className="bg-emerald-900/40 border border-emerald-800/80 rounded-2xl p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-white">{typeof val === 'number' ? val.toLocaleString() : val}</div>
                    <div className="text-[10px] font-bold uppercase text-emerald-400">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CO₂ stat */}
            {stats && (
              <div className="bg-gradient-to-r from-emerald-900 to-teal-950 border border-emerald-700/60 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-emerald-400">CO₂ Saved</div>
                  <div className="text-2xl font-black text-white">{stats.totalCo2SavedKg} <span className="text-sm font-semibold text-emerald-300">kg</span></div>
                </div>
                <TrendingUp className="w-10 h-10 text-emerald-500/40" />
              </div>
            )}

            {/* Ports status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Charging Ports</span>
                <button onClick={loadAll} className="text-emerald-400 hover:text-white min-h-0 h-auto py-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              {portsList.map((p) => (
                <div key={p.portId} className="bg-emerald-900/30 border border-emerald-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white">Port #{p.portNumber}</div>
                    <div className="text-xs text-emerald-400">{p.connectorType}</div>
                  </div>
                  <select
                    value={p.portStatus}
                    onChange={(e) => handlePortStatusChange(p.portId, e.target.value as PortStatus)}
                    className="bg-emerald-950 border border-emerald-700 text-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none min-h-0 h-auto"
                  >
                    <option value="Available">Available</option>
                    <option value="In Use">In Use</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        );

      /* ── USERS ───────────────────────────────────────────────── */
      case 'users':
        const filteredUsers = usersList.filter((u) =>
          u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.username.toLowerCase().includes(userSearch.toLowerCase())
        );
        return (
          <div className="px-4 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Users</h2>
              <span className="text-xs text-emerald-400">{filteredUsers.length} accounts</span>
            </div>
            <input
              type="text" placeholder="Search users…"
              value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 text-sm focus:outline-none focus:border-emerald-400"
            />
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div key={u.userId} className="bg-emerald-900/30 border border-emerald-800/60 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                    {u.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{u.fullName}</div>
                    <div className="text-[10px] text-emerald-400/80 truncate">{u.email}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-amber-300">{u.currentPoints} PTS</div>
                    <button
                      onClick={() => { setSelectedUserForPoints(u); setPointsAdjInput(50); }}
                      className="text-[10px] text-emerald-400 hover:text-white underline mt-0.5 min-h-0 h-auto py-0"
                    >
                      Adjust
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      /* ── DEPOSITS ────────────────────────────────────────────── */
      case 'deposits':
        const filteredDeposits = recyclingLogs.filter((t) =>
          t.bottleType.toLowerCase().includes(depositSearch.toLowerCase()) ||
          t.bottleSize.toLowerCase().includes(depositSearch.toLowerCase())
        );
        return (
          <div className="px-4 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Bottle Deposits</h2>
              <span className="text-xs text-emerald-400">{filteredDeposits.length} records</span>
            </div>
            <input
              type="text" placeholder="Search deposits…"
              value={depositSearch} onChange={(e) => setDepositSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 text-sm focus:outline-none focus:border-emerald-400"
            />
            <div className="space-y-2">
              {filteredDeposits.map((t) => (
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
      case 'charging_log':
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
              type="text" placeholder="Search sessions…"
              value={chargingSearch} onChange={(e) => setChargingSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 text-sm focus:outline-none focus:border-emerald-400"
            />
            <div className="space-y-2">
              {filteredCharging.map((s) => (
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

      /* ── SETTINGS ────────────────────────────────────────────── */
      case 'settings':
        return (
          <div className="px-4 py-5 space-y-5">
            <h2 className="text-base font-black text-white">System Settings</h2>

            {/* ── Table 2.3 Bottle Points Conversion ─────────────────── */}
            <div className="bg-[#021f14] border border-emerald-800/60 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3.5 border-b border-emerald-800/60 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-white">Table 2.3 — Plastic Bottle Points Conversion</div>
                  <div className="text-[11px] text-emerald-400/70 mt-0.5">Rate per bottle size · 1 min charging = 10 pts</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#011b11] text-emerald-400 font-bold uppercase tracking-wider text-[11px] border-b border-emerald-800">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Size (mL)</th>
                      <th className="py-3 px-4 text-amber-300">Points</th>
                      <th className="py-3 px-4 text-teal-300">Time (Mins)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-800/40">
                    {[
                      { category: 'Small',  size: '190',       points: 0.5, time: '0.5 (30 secs)', rowSpan: true,  cat: 'small' },
                      { category: '',       size: '237 – 290', points: 1,   time: '1',             rowSpan: false, cat: 'small' },
                      { category: 'Medium', size: '500',       points: 3,   time: '3',             rowSpan: true,  cat: 'medium' },
                      { category: '',       size: '1000',      points: 5,   time: '5',             rowSpan: false, cat: 'medium' },
                      { category: 'Large',  size: '1500 – 1750', points: 8, time: '8',             rowSpan: true,  cat: 'large' },
                      { category: '',       size: '2000',      points: 10,  time: '10',            rowSpan: false, cat: 'large' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-emerald-900/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          {row.category && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              row.cat === 'small'  ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' :
                              row.cat === 'medium' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
                                                     'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            }`}>
                              {row.category}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-200">{row.size}</td>
                        <td className="py-3 px-4 font-extrabold text-amber-300">
                          +{row.points} {row.points === 0.5 ? <span className="text-emerald-400/60 font-normal text-[10px]">(→ 1)</span> : ''}
                        </td>
                        <td className="py-3 px-4 font-semibold text-teal-300">{row.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-emerald-800/60 text-[10px] text-emerald-400/60">
                ⓘ 190ml = 0.5 pts rounded up to 1 pt in practice · Points auto-convert to charging time at 10 pts/min
              </div>
            </div>

            {/* ── Editable rate overrides ─────────────────────────────── */}
            <div className="bg-[#021f14] border border-emerald-800/60 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-emerald-300">Rate Overrides</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Small\n(default 1)', val: rateSmall,  set: setRateSmall,  colour: 'text-teal-300' },
                  { label: 'Medium\n(default 3)', val: rateMedium, set: setRateMedium, colour: 'text-amber-300' },
                  { label: 'Large\n(default 8)',  val: rateLarge,  set: setRateLarge,  colour: 'text-rose-300' },
                ].map(({ label, val, set, colour }) => (
                  <div key={label} className="space-y-1.5">
                    <label className={`block text-[10px] font-bold uppercase tracking-wider whitespace-pre-line ${colour}`}>{label}</label>
                    <input
                      type="number" min={1}
                      value={val}
                      onChange={(e) => set(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white text-sm font-bold focus:outline-none focus:border-emerald-400 text-center"
                    />
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-emerald-400/60">
                Overrides apply to manually-selected bottle sizes (no YOLO detection). YOLO detections always use the Table 2.3 rates.
              </div>
              <button
                onClick={handleSaveRates}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 text-emerald-950 font-extrabold text-sm active:scale-95 transition-transform"
              >
                Save Rate Overrides
              </button>
              {rateSavedMsg && (
                <div className="text-xs text-center text-emerald-300">{rateSavedMsg}</div>
              )}
            </div>

            {/* ── Duration → Points reference ─────────────────────────── */}
            <div className="bg-[#021f14] border border-emerald-800/60 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3.5 border-b border-emerald-800/60">
                <div className="text-sm font-black text-white">Charging Duration Reference</div>
                <div className="text-[11px] text-emerald-400/70 mt-0.5">10 pts = 1 minute of charging</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#011b11] text-emerald-400 font-bold uppercase tracking-wider text-[11px] border-b border-emerald-800">
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4 text-amber-300">Points Required</th>
                      <th className="py-3 px-4 text-teal-300">Equiv. Bottles (500ml)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-800/40">
                    {[
                      { mins: 1,  pts: 10,  bottles: '~4' },
                      { mins: 3,  pts: 30,  bottles: '10' },
                      { mins: 5,  pts: 50,  bottles: '~17' },
                      { mins: 8,  pts: 80,  bottles: '~27' },
                      { mins: 10, pts: 100, bottles: '~34' },
                    ].map((r) => (
                      <tr key={r.mins} className="hover:bg-emerald-900/30">
                        <td className="py-3 px-4 font-bold text-white">{r.mins} min{r.mins > 1 ? 's' : ''}</td>
                        <td className="py-3 px-4 font-extrabold text-amber-300">{r.pts} pts</td>
                        <td className="py-3 px-4 text-emerald-300">{r.bottles} × 500ml bottles</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'kiosk':
        return <KioskPage />;
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-emerald-950">
      <ConsoleSidebar
        currentTab={activeTab}
        onSelectTab={handleSelectTab}
        mode={consoleMode}
        onToggleMode={handleToggleMode}
      />

      <div className="flex-1 overflow-y-auto mb-nav kiosk-scroll">
        {renderTab()}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[440px] bg-emerald-800 border border-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl z-50 text-center">
          {toast}
        </div>
      )}

      {/* Adjust Points Bottom Sheet */}
      {selectedUserForPoints && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-emerald-950 border border-emerald-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Adjust Points</h3>
              <button onClick={() => setSelectedUserForPoints(null)} className="text-emerald-400 hover:text-white min-h-0 h-auto">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-emerald-300">
              User: <strong className="text-white">{selectedUserForPoints.fullName}</strong> · Current: <strong className="text-amber-300">{selectedUserForPoints.currentPoints} PTS</strong>
            </div>
            <form onSubmit={handleAdjustPoints} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-emerald-400">Points Adjustment (± value)</label>
                <input
                  type="number"
                  value={pointsAdjInput}
                  onChange={(e) => setPointsAdjInput(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3.5 rounded-xl bg-emerald-900/60 border border-emerald-700 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-emerald-400">Reason</label>
                <input
                  type="text"
                  value={pointsAdjReason}
                  onChange={(e) => setPointsAdjReason(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-emerald-900/60 border border-emerald-700 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <button type="submit" className="w-full py-3.5 rounded-2xl bg-emerald-500 text-emerald-950 font-extrabold text-sm active:scale-95 transition-transform">
                Apply Adjustment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
