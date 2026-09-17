import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, Sparkles, LogOut, ArrowLeft } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, currentPage, setCurrentPage, logout } = useAuth();

  // Hide on console pages — they use the bottom nav instead
  if (user && ['dashboard', 'admin'].includes(currentPage)) {
    return null;
  }

  // Sub-pages that show a back button instead of full nav
  const subPages: Record<string, { label: string; back: string }> = {
    'bottle-detection':  { label: 'Recycle Bottle',      back: 'dashboard' },
    'port-selection':    { label: 'Select Port',          back: 'dashboard' },
    'charging-duration': { label: 'Charging Duration',    back: 'port-selection' },
    'charging-session':  { label: 'Charging Session',     back: 'dashboard' },
    'recycling-history': { label: 'Recycle History',      back: 'dashboard' },
    'charging-history':  { label: 'Charging History',     back: 'dashboard' },
    'profile':           { label: 'My Profile',           back: 'dashboard' },
    'terms-privacy':     { label: 'Terms & Privacy',      back: 'landing' },
  };

  const subPageInfo = subPages[currentPage];

  if (subPageInfo) {
    return (
      <header className="sticky top-0 z-50 bg-[#02180f]/95 backdrop-blur-md border-b border-emerald-800/50 px-4 h-14 flex items-center justify-between shrink-0">
        <button
          onClick={() => setCurrentPage(subPageInfo.back)}
          className="flex items-center gap-2 text-emerald-300 hover:text-white transition-colors min-h-0 h-auto py-0"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Back</span>
        </button>

        <span className="text-sm font-bold text-white tracking-tight">{subPageInfo.label}</span>

        {user ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/60">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-extrabold text-amber-300">{user.currentPoints}</span>
          </div>
        ) : (
          <div className="w-16" />
        )}
      </header>
    );
  }

  // Landing / auth pages — show the brand header
  return (
    <header className="sticky top-0 z-50 bg-[#02180f]/95 backdrop-blur-md border-b border-emerald-800/50 shrink-0">
      {/* Brand row */}
      <div className="px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => setCurrentPage(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-2.5 min-h-0 h-auto py-0"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow">
            <Leaf className="w-5 h-5 text-emerald-950 fill-current" />
          </div>
          <div className="leading-none">
            <div className="text-base font-black tracking-tight text-white">EcoCharge</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Smart Kiosk</div>
          </div>
        </button>

        {user ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/60">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-extrabold text-amber-300">{user.currentPoints} PTS</span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-emerald-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors min-h-0 h-auto"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage('signin')}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold text-emerald-200 hover:bg-emerald-900/60 transition-colors min-h-0 h-auto"
            >
              Sign In
            </button>
            <button
              onClick={() => setCurrentPage('register')}
              className="px-3 py-1.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 transition-colors min-h-0 h-auto"
            >
              Register
            </button>
          </div>
        )}
      </div>

      {/* Landing section tab pills */}
      {(currentPage === 'landing' || currentPage === 'how-it-works' || currentPage === 'rewards' || currentPage === 'about') && !user && (
        <div className="px-4 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 'landing',       label: 'Home' },
            { id: 'how-it-works',  label: 'How It Works' },
            { id: 'rewards',       label: 'Rewards' },
            { id: 'about',         label: 'About' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentPage(tab.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors min-h-0 h-auto ${
                currentPage === tab.id
                  ? 'bg-emerald-700/80 text-white'
                  : 'text-emerald-300/80 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
