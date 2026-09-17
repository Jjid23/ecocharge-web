import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CameraDetector } from '../components/CameraDetector';
import { Leaf, Award } from 'lucide-react';
import { BottleSize } from '../types';
import { Footer } from '../components/Footer';

export const BottleDetectionPage: React.FC = () => {
  const { user, setCurrentPage } = useAuth();
  const [latestScan, setLatestScan] = useState<{
    bottleSize: BottleSize;
    pointsEarned: number;
    bottleType: string;
  } | null>(null);

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="px-4 py-5 space-y-5">

        {/* Header card */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-950 border border-emerald-800 rounded-3xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-emerald-950 flex items-center justify-center shrink-0">
              <Leaf className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-base font-black text-white">Plastic Bottle Recycling</h1>
              <p className="text-xs text-emerald-200/80">Insert bottle into view for AI classification</p>
            </div>
          </div>

          {/* Point rules row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { range: '<400ml', label: 'Small',  pts: '+5',  sub: '330ml Soda' },
              { range: '400–750ml', label: 'Medium', pts: '+10', sub: '500ml Water' },
              { range: '>750ml', label: 'Large',  pts: '+15', sub: '1.5L Bottle' },
            ].map(({ range, label, pts, sub }) => (
              <div key={label} className="bg-emerald-950/80 p-2.5 rounded-xl border border-emerald-800 text-center">
                <div className="text-[9px] uppercase font-bold text-emerald-400">{range}</div>
                <div className="text-base font-black text-amber-300">{pts}</div>
                <div className="text-[9px] text-emerald-300/80">{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Camera Detector */}
        <CameraDetector
          onSuccess={(res) => setLatestScan(res)}
          onNavigateCharging={() => setCurrentPage('port-selection')}
        />
      </div>

      <Footer />
    </div>
  );
};
