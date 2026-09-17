import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, FileText, Leaf, Lock } from 'lucide-react';
import { Footer } from '../components/Footer';

const sections = [
  {
    icon: Leaf,
    color: 'text-emerald-400 bg-emerald-500/20',
    title: '1. Bottle Deposit & Reward Points',
    body: 'Users earn EcoCharge reward points by depositing clean, empty recyclable plastic bottles into EcoCharge smart kiosks. Points are credited based on verified bottle volume classification — Small: 5 pts, Medium: 10 pts, Large: 15 pts. Non-recyclable items or contaminated waste will be rejected by the AI vision scanner.',
  },
  {
    icon: FileText,
    color: 'text-amber-400 bg-amber-500/20',
    title: '2. Mobile Device Charging Port Usage',
    body: 'Reward points are non-transferable and can be redeemed for active charging time at any EcoCharge kiosk. Charging sessions automatically terminate when the selected duration expires or when manually stopped by the user. Points are deducted at session start and are non-refundable once a session is active.',
  },
  {
    icon: Lock,
    color: 'text-teal-400 bg-teal-500/20',
    title: '3. Data Privacy & Camera Protection',
    body: 'EcoCharge camera feeds are processed strictly for real-time plastic bottle geometry and material classification. No personal facial imagery or unneeded video recordings are permanently stored on public servers. Account passwords and personal details are protected using industry-standard secure hashing algorithms.',
  },
  {
    icon: ShieldCheck,
    color: 'text-emerald-300 bg-emerald-400/20',
    title: '4. Account Responsibility',
    body: 'Users are responsible for maintaining the confidentiality of their login credentials. EcoCharge reserves the right to suspend or terminate accounts found misusing the rewards system, including but not limited to inserting non-recyclable items or attempting to manipulate the AI detection system.',
  },
];

export const TermsPrivacyPage: React.FC = () => {
  const { setCurrentPage } = useAuth();

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="px-4 py-5 space-y-5">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-950 border border-emerald-800 rounded-3xl p-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-emerald-950 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-base font-black text-white">Terms &amp; Privacy Policy</h1>
              <p className="text-xs text-emerald-200/80">EcoCharge Smart Kiosk System</p>
            </div>
          </div>
          <p className="text-[11px] text-emerald-400/70">Last updated: August 2, 2026</p>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map(({ icon: Icon, color, title, body }) => (
            <div key={title} className="bg-emerald-900/40 border border-emerald-800/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white leading-snug">{title}</h2>
              </div>
              <p className="text-xs text-emerald-200/80 leading-relaxed pl-11">{body}</p>
            </div>
          ))}
        </div>

        {/* Agreement CTA */}
        <div className="bg-emerald-950/60 border border-emerald-800 rounded-2xl p-4 text-center space-y-3">
          <p className="text-xs text-emerald-300/80 leading-relaxed">
            By using EcoCharge services you agree to these terms and our privacy policy.
          </p>
          <button
            onClick={() => setCurrentPage('landing')}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-emerald-950 font-extrabold text-sm active:scale-95 transition-transform"
          >
            Back to Home
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};
