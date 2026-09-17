import React from 'react';
import { Leaf, Mail, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Footer: React.FC = () => {
  const { setCurrentPage } = useAuth();

  return (
    <footer className="mt-auto bg-emerald-950 border-t border-emerald-900/80 px-4 py-5 shrink-0">
      {/* Quick links row */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-4 text-xs text-emerald-400/80">
        <button onClick={() => setCurrentPage('landing')}       className="hover:text-emerald-200 transition-colors">Home</button>
        <span className="text-emerald-800">·</span>
        <button onClick={() => setCurrentPage('how-it-works')}  className="hover:text-emerald-200 transition-colors">How It Works</button>
        <span className="text-emerald-800">·</span>
        <button onClick={() => setCurrentPage('rewards')}       className="hover:text-emerald-200 transition-colors">Rewards</button>
        <span className="text-emerald-800">·</span>
        <button onClick={() => setCurrentPage('terms-privacy')} className="hover:text-emerald-200 transition-colors">Terms &amp; Privacy</button>
      </div>

      {/* Brand + copyright */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
            <Leaf className="w-3.5 h-3.5 text-emerald-950 fill-current" />
          </div>
          <span className="text-sm font-extrabold text-white tracking-tight">EcoCharge</span>
        </div>
        <p className="text-[11px] text-emerald-500/70 text-center">
          © {new Date().getFullYear()} EcoCharge Smart Kiosk System
        </p>
        <p className="text-[10px] text-emerald-600/60 flex items-center gap-1">
          Powered by Green Energy &amp; AI Vision <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
        </p>
        <div className="flex items-center gap-1 text-[10px] text-emerald-600/60">
          <Mail className="w-3 h-3" />
          <span>support@ecocharge.org</span>
        </div>
      </div>
    </footer>
  );
};
