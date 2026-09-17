import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchRecyclingHistory } from '../services/api';
import { BottleTransaction } from '../types';
import { Leaf, Search, CheckCircle2, Filter } from 'lucide-react';
import { Footer } from '../components/Footer';

export const RecyclingHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<BottleTransaction[]>([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [sizeFilter, setSizeFilter]     = useState('all');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchRecyclingHistory(user.userId)
        .then((res) => setTransactions(res.transactions))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user?.userId]);

  if (!user) return null;

  const filtered = transactions.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = t.transactionId.toLowerCase().includes(q) ||
      t.bottleType.toLowerCase().includes(q) ||
      t.bottleSize.toLowerCase().includes(q);
    const matchFilter = sizeFilter === 'all' || t.bottleSize === sizeFilter;
    return matchSearch && matchFilter;
  });

  const totalPts     = filtered.reduce((a, t) => a + t.pointsEarned, 0);
  const totalBottles = filtered.reduce((a, t) => a + t.quantity, 0);

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="px-4 py-5 space-y-4">

        {/* Header summary */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-950 border border-emerald-800 rounded-3xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-emerald-950 flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-base font-black text-white">Recycling History</h1>
              <p className="text-xs text-emerald-200/80">All your bottle deposit records</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-950/80 rounded-xl p-2.5 border border-emerald-800 text-center">
              <div className="text-[10px] font-bold uppercase text-emerald-400">Total Bottles</div>
              <div className="text-lg font-black text-white">{totalBottles}</div>
            </div>
            <div className="bg-emerald-950/80 rounded-xl p-2.5 border border-emerald-800 text-center">
              <div className="text-[10px] font-bold uppercase text-emerald-400">Points Earned</div>
              <div className="text-lg font-black text-amber-300">+{totalPts}</div>
            </div>
          </div>
        </div>

        {/* Search + filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="recycling-search-input"
              type="text"
              placeholder="Search by type or size…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex gap-2 flex-1">
              {['all', 'small', 'medium', 'large'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSizeFilter(f)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all min-h-0 h-auto ${
                    sizeFilter === f
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-950/60 border border-emerald-800 text-emerald-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction list */}
        {loading ? (
          <div className="text-center py-10 text-xs text-emerald-400/60">Loading records…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-emerald-400/60">No records match your search.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <div key={t.transactionId} className="bg-emerald-900/30 border border-emerald-800/60 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-700 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white capitalize">{t.bottleSize} · {t.bottleType}</div>
                  <div className="text-[11px] text-emerald-400/80 mt-0.5">
                    {new Date(t.detectedAt).toLocaleDateString()} {new Date(t.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Qty {t.quantity}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-300 font-medium">{t.detectionStatus}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-extrabold text-emerald-400">+{t.pointsEarned}</div>
                  <div className="text-[10px] text-emerald-500 uppercase font-bold">PTS</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};
