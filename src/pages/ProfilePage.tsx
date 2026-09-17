import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, KeyRound, Sparkles, CheckCircle2, AlertCircle, Award, Leaf } from 'lucide-react';
import { Footer } from '../components/Footer';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, setCurrentPage, loading, error, clearError } = useAuth();

  const [fullName, setFullName]           = useState(user?.fullName || '');
  const [username, setUsername]           = useState(user?.username || '');
  const [email, setEmail]                 = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [successMsg, setSuccessMsg]       = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    clearError();
    try {
      await updateProfile({
        fullName, username, email,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setSuccessMsg('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch { /* handled in context */ }
  };

  return (
    <div className="flex flex-col flex-1 pb-4">
      <div className="px-4 py-5 space-y-5">

        {/* Profile header card */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-950 border border-emerald-800 rounded-3xl p-5">
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-emerald-950 flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-black text-white truncate">{user.fullName}</div>
              <div className="text-xs text-emerald-300">@{user.username}</div>
              <div className="text-[11px] text-emerald-400/70 mt-0.5 capitalize">
                {user.role} · joined {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-950/80 rounded-2xl p-3 border border-emerald-800 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[10px] font-bold uppercase text-emerald-400">Points</span>
              </div>
              <div className="text-xl font-black text-amber-300">{user.currentPoints}</div>
            </div>
            <div className="bg-emerald-950/80 rounded-2xl p-3 border border-emerald-800 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase text-emerald-400">Role</span>
              </div>
              <div className="text-sm font-black text-white capitalize">{user.role}</div>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="bg-emerald-900/40 border border-emerald-800/80 rounded-3xl p-5 space-y-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-emerald-400" /> Account Settings
          </h2>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-900/90 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {successMsg}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">Full Name</label>
              <input
                id="profile-fullname-input"
                type="text" required
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">Username</label>
              <input
                id="profile-username-input"
                type="text" required
                value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">Email Address</label>
              <input
                id="profile-email-input"
                type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            {/* Password section */}
            <div className="pt-2 border-t border-emerald-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Change Password
                <span className="normal-case font-normal text-emerald-500">(optional)</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-emerald-400">Current Password</label>
                <input
                  id="profile-current-pass"
                  type="password" placeholder="Current password"
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-emerald-400">New Password</label>
                <input
                  id="profile-new-pass"
                  type="password" placeholder="New password"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <button
              id="save-profile-btn"
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-emerald-950 font-extrabold text-base shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCurrentPage('bottle-detection')}
            className="bg-emerald-900/40 border border-emerald-800 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <Leaf className="w-6 h-6 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-200">Recycle</span>
          </button>
          <button
            onClick={() => setCurrentPage('charging-history')}
            className="bg-emerald-900/40 border border-emerald-800 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <Sparkles className="w-6 h-6 text-amber-400" />
            <span className="text-xs font-bold text-emerald-200">History</span>
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};
