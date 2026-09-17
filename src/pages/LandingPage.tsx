import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Leaf, Zap, Award, ShieldCheck, ArrowRight, BatteryCharging,
  Smartphone, Sparkles, Users, Globe, CheckCircle
} from 'lucide-react';
import { fetchAdminStats } from '../services/api';
import { Footer } from '../components/Footer';

export const LandingPage: React.FC = () => {
  const { user, currentPage, setCurrentPage } = useAuth();

  const [stats, setStats] = useState({
    totalBottlesRecycled: 1420,
    totalPointsAwarded: 18500,
    totalChargingSessions: 480,
    totalRegisteredUsers: 120,
    totalCo2SavedKg: 116.4,
  });

  useEffect(() => {
    fetchAdminStats()
      .then((res) => { if (res.stats) setStats(res.stats); })
      .catch(() => {});
  }, []);

  // Smooth scroll on section nav
  useEffect(() => {
    const timer = setTimeout(() => {
      const map: Record<string, string> = {
        'how-it-works': 'how-it-works-section',
        rewards: 'rewards-section',
        about: 'about-section',
        landing: '',
      };
      const id = map[currentPage];
      if (id) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      } else if (currentPage === 'landing') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [currentPage]);

  return (
    <div className="flex flex-col pb-4">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section id="hero-section" className="relative px-5 pt-8 pb-10 overflow-hidden">
        {/* ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center gap-5">
          {/* badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-xs font-bold text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Next-Gen Eco-Kiosk Network
          </div>

          {/* headline */}
          <h1 className="text-3xl font-black tracking-tight leading-[1.15] text-white">
            Recycle Bottles.<br />
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300 bg-clip-text text-transparent">
              Earn Points.
            </span><br />
            Charge Your Device.
          </h1>

          <p className="text-sm text-emerald-100/75 leading-relaxed">
            Deposit recyclable plastic bottles, earn reward points, and use them to charge your device at our smart kiosks.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 w-full">
            <button
              id="hero-get-started-btn"
              onClick={() => setCurrentPage(user ? 'dashboard' : 'register')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-emerald-950 font-black text-base shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <span>{user ? 'Go to Dashboard' : 'Get Started Now'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              id="hero-learn-more-btn"
              onClick={() => setCurrentPage('how-it-works')}
              className="w-full py-3.5 rounded-2xl bg-emerald-900/60 border border-emerald-700/60 text-emerald-100 font-semibold text-sm active:scale-95 transition-transform"
            >
              Learn How It Works
            </button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section id="how-it-works-section" className="px-4 py-8 scroll-mt-16">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-xs font-bold text-emerald-300 mb-2">
            <Leaf className="w-3.5 h-3.5" /> Simple 5-Step Process
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">How EcoCharge Works</h2>
          <p className="text-xs text-emerald-200/70 mt-1">Turn bottle waste into charging time in five easy steps.</p>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { step: '1', title: 'Sign In',         desc: 'Log in or create your EcoCharge account.',                     icon: Users },
            { step: '2', title: 'Deposit Bottle',  desc: 'Insert a recyclable plastic bottle into the smart scanner.',   icon: Leaf },
            { step: '3', title: 'Earn Points',     desc: 'AI detects bottle size and credits points instantly.',          icon: Award },
            { step: '4', title: 'Select Port',     desc: 'Choose an available charging cable or port.',                  icon: Zap },
            { step: '5', title: 'Charge Device',   desc: 'Plug in and enjoy fast green-energy charging.',                icon: Smartphone },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="bg-emerald-900/40 border border-emerald-800/80 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-emerald-950 font-black text-sm flex items-center justify-center shrink-0">
                {step}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{title}</div>
                <div className="text-xs text-emerald-200/70 leading-snug">{desc}</div>
              </div>
              <Icon className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* ── REWARDS ──────────────────────────────────────────────── */}
      <section id="rewards-section" className="px-4 py-8 scroll-mt-16">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-xs font-bold text-amber-300 mb-2">
            <Award className="w-3.5 h-3.5 text-amber-400" /> Reward Points Structure
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Recycling Rewards &amp; Rates</h2>
          <p className="text-xs text-emerald-200/70 mt-1">Every bottle earns points you can redeem for charging time.</p>
        </div>

        <div className="flex flex-col gap-3 mb-5">
          {[
            { size: '500ml', label: 'Small Bottle',  desc: 'Standard water & soda up to 500ml.',      pts: '+5 PTS',  mins: '~2.5 Mins', color: 'text-emerald-400' },
            { size: '1.0L',  label: 'Medium Bottle', desc: 'Sports drinks from 500ml to 1.0 Liters.', pts: '+10 PTS', mins: '~5.0 Mins', color: 'text-amber-400',   ring: true },
            { size: '1.5L+', label: 'Large Bottle',  desc: 'Large soda & gallon bottles over 1.0 L.', pts: '+15 PTS', mins: '~7.5 Mins', color: 'text-teal-400' },
          ].map(({ size, label, desc, pts, mins, color, ring }) => (
            <div key={size} className={`bg-emerald-900/40 border rounded-2xl p-4 flex items-center gap-4 ${ring ? 'border-emerald-600/80 ring-1 ring-emerald-500/30' : 'border-emerald-800'}`}>
              <div className={`w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center font-black text-xs shrink-0 ${color}`}>
                {size}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{label}</div>
                <div className="text-xs text-emerald-200/70 leading-snug">{desc}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base font-black text-amber-300">{pts}</div>
                <div className="text-[11px] text-teal-300 font-semibold">{mins}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Exchange rate banner */}
        <div className="bg-gradient-to-r from-emerald-900/80 to-teal-900/80 border border-emerald-700/60 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Exchange Rate</div>
            <div className="text-sm font-black text-white leading-tight">2 Points = 1 Min Charging</div>
          </div>
          <button
            id="rewards-start-btn"
            onClick={() => setCurrentPage(user ? 'bottle-detection' : 'register')}
            className="py-2.5 px-4 rounded-xl bg-amber-400 text-amber-950 font-black text-xs uppercase shrink-0 active:scale-95 transition-transform"
          >
            Start Earning
          </button>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────────────── */}
      <section id="about-section" className="px-4 py-8 scroll-mt-16">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-xs font-bold text-emerald-300 mb-2">
            <Globe className="w-3.5 h-3.5" /> Smart Urban Infrastructure
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">About EcoCharge Kiosks</h2>
          <p className="text-xs text-emerald-200/70 mt-1">AI, hardware telemetry, and clean energy encouraging recycling.</p>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { icon: Sparkles,      color: 'text-emerald-400 bg-emerald-500/20', title: 'AI Vision Detection',    desc: 'Computer vision models scan bottles and verify material composition and size.' },
            { icon: Zap,           color: 'text-teal-400 bg-teal-500/20',       title: 'Multi-Port Power',       desc: 'USB-C PD and Lightning fast charging with isolated voltage regulation.' },
            { icon: ShieldCheck,   color: 'text-amber-400 bg-amber-500/20',     title: 'Live Telemetry',         desc: 'Real-time kiosk monitoring, power stability, and maintenance diagnostics.' },
            { icon: Leaf,          color: 'text-emerald-300 bg-emerald-400/20', title: 'Circular Eco Mission',   desc: 'Diverts plastic from landfills into certified recycling streams.' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-emerald-900/30 border border-emerald-800/80 rounded-2xl p-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{title}</div>
                <div className="text-xs text-emerald-200/70 leading-snug">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── IMPACT STATS ─────────────────────────────────────────── */}
      <section className="px-4 py-6">
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-teal-950 rounded-3xl p-5 border border-emerald-700/60">
          <h2 className="text-base font-extrabold text-white text-center mb-5">Our Environmental Impact</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Leaf,           color: 'text-emerald-400 bg-emerald-500/20', val: stats.totalBottlesRecycled.toLocaleString(), label: 'Bottles Recycled' },
              { icon: Award,          color: 'text-amber-400 bg-amber-500/20',     val: stats.totalPointsAwarded.toLocaleString(),   label: 'Points Awarded',    valClass: 'text-amber-300' },
              { icon: BatteryCharging,color: 'text-teal-400 bg-teal-500/20',       val: stats.totalChargingSessions.toLocaleString(), label: 'Charging Sessions' },
              { icon: Globe,          color: 'text-emerald-300 bg-emerald-400/20', val: `${stats.totalCo2SavedKg} kg`,               label: 'CO₂ Saved',         valClass: 'text-emerald-300' },
            ].map(({ icon: Icon, color, val, label, valClass }) => (
              <div key={label} className="bg-emerald-950/80 p-4 rounded-2xl border border-emerald-800 text-center">
                <div className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center mb-2 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`text-xl font-black text-white ${valClass ?? ''}`}>{val}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
