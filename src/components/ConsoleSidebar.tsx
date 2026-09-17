import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Leaf, LayoutDashboard, Monitor, Bell, BatteryCharging,
  Clock, Sparkles, Users, Cpu, TrendingUp, Settings, Zap,
  User as UserIcon, LogOut, History, Activity, Award,
  ArrowLeftRight, PlusCircle
} from 'lucide-react';

interface ConsoleSidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  mode: 'user' | 'admin';
  onToggleMode?: () => void;
}

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({
  currentTab,
  onSelectTab,
  mode,
  onToggleMode,
}) => {
  const { user, logout, activeSession } = useAuth();
  if (!user) return null;

  /* ── Tab definitions ─────────────────────────────────────── */
  const adminTabs = [
    { id: 'dashboard',    label: 'Overview',   icon: LayoutDashboard },
    { id: 'users',        label: 'Users',       icon: Users },
    { id: 'deposits',     label: 'Deposits',    icon: Leaf },
    { id: 'charging_log', label: 'Charging',    icon: BatteryCharging },
    { id: 'kiosk',        label: 'Kiosk ESP32', icon: Cpu },
    { id: 'settings',     label: 'Settings',    icon: Settings },
  ];

  const userTabs = [
    { id: 'dashboard',       label: 'Home',      icon: LayoutDashboard },
    { id: 'bottle-detection', label: 'Recycle',  icon: Leaf, highlight: true },
    { id: 'port-selection',  label: 'Charge',    icon: Zap },
    { id: 'ledger',          label: 'Credits',   icon: Sparkles },
    { id: 'profile',         label: 'Profile',   icon: UserIcon },
  ];

  const tabs = mode === 'admin' ? adminTabs : userTabs;

  const handleTab = (id: string) => {
    onSelectTab(id);
  };

  return (
    <>
      {/* ── Top console header strip ─────────────────────── */}
      <div className="bg-[#021f14] border-b border-emerald-800/50 px-4 py-3 flex items-center justify-between shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow">
            <Leaf className="w-4.5 h-4.5 text-emerald-950 fill-current w-[18px] h-[18px]" />
          </div>
          <div className="leading-none">
            <div className="text-sm font-black tracking-tight text-white">EcoCharge</div>
            <div className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400">
              {mode === 'admin' ? 'Admin Console' : 'User Console'}
            </div>
          </div>
        </div>

        {/* Right: points + mode switch + logout */}
        <div className="flex items-center gap-2">
          {/* Points badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/60">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-extrabold text-amber-300">{user.currentPoints}</span>
          </div>

          {/* Mode switcher (admin only) */}
          {user.role === 'admin' && onToggleMode && (
            <button
              onClick={onToggleMode}
              className="p-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 border border-emerald-700/60 text-amber-300 transition-colors min-h-0 h-auto"
              title={`Switch to ${mode === 'admin' ? 'User' : 'Admin'}`}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          )}

          {/* Logout */}
          <button
            id="sidebar-logout-btn"
            onClick={logout}
            className="p-1.5 rounded-lg text-emerald-400/80 hover:text-rose-300 hover:bg-rose-950/60 transition-colors min-h-0 h-auto"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Bottom Navigation Bar ─────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-[#021f14]/95 backdrop-blur-md border-t border-emerald-800/50 pb-safe">
        <div className="flex items-stretch">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            const hasActiveBadge = tab.id === 'port-selection' && activeSession;

            return (
              <button
                key={tab.id}
                id={`sidebar-item-${tab.id}`}
                onClick={() => handleTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors min-h-0 h-auto ${
                  isActive
                    ? 'text-emerald-300'
                    : 'text-emerald-600 hover:text-emerald-400'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-emerald-400 rounded-full" />
                )}

                {/* Active session pulse dot */}
                {hasActiveBadge && (
                  <div className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}

                <div className={`relative w-7 h-7 flex items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? 'bg-emerald-900/80 shadow-md'
                    : tab.highlight
                    ? 'bg-emerald-900/40'
                    : ''
                }`}>
                  <Icon className={`w-4.5 h-4.5 w-[18px] h-[18px] transition-transform ${isActive ? 'scale-110' : ''} ${
                    tab.highlight && !isActive ? 'text-emerald-400' : ''
                  }`} />
                </div>

                <span className={`text-[10px] font-bold leading-none ${
                  isActive ? 'text-emerald-300' : 'text-emerald-600'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
