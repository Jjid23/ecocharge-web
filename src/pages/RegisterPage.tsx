import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';
import { Footer } from '../components/Footer';

export const RegisterPage: React.FC = () => {
  const { register, setCurrentPage, loading, error, clearError } = useAuth();

  const [fullName, setFullName]               = useState('');
  const [username, setUsername]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!fullName.trim()) { setValidationError('Please enter your full name.'); return; }
    if (!username.trim() || username.length < 3) { setValidationError('Username must be at least 3 characters.'); return; }
    if (!email.trim() || !email.includes('@')) { setValidationError('Please enter a valid email address.'); return; }
    if (!password || password.length < 6) { setValidationError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setValidationError('Passwords do not match.'); return; }

    try { await register(fullName, username, email, password); } catch { /* handled in context */ }
  };

  const displayError = validationError || error;

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 px-5 py-8 flex flex-col justify-center gap-5">

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl">
            <Leaf className="w-9 h-9 text-emerald-950 fill-current" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Create Account</h2>
            <p className="text-xs text-emerald-200/70 mt-1">Join the bottle recycling rewards network</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-xs text-emerald-300">
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            <span>Join the bottle recycling rewards network</span>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-emerald-900/40 border border-emerald-800/80 rounded-3xl p-5 shadow-2xl space-y-4">
          {displayError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">Full Name</label>
              <input
                id="register-fullname"
                type="text" required placeholder="e.g. Jane Doe"
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">Username</label>
              <input
                id="register-username"
                type="text" required placeholder="e.g. janedoe"
                value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">Email Address</label>
              <input
                id="register-email"
                type="email" required placeholder="jane@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">Password</label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'} required placeholder="At least 6 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400 pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white p-1 min-h-0 h-auto">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">Confirm Password</label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type={showConfirm ? 'text' : 'password'} required placeholder="Re-enter password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400 pr-12"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white p-1 min-h-0 h-auto">
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                id="submit-register-btn"
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-emerald-950 font-extrabold text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
              >
                <UserPlus className="w-5 h-5" />
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>

        {/* Sign-in link */}
        <div className="text-center">
          <p className="text-sm text-emerald-200/80">
            Already have an account?{' '}
            <button
              id="register-to-signin-link"
              onClick={() => setCurrentPage('signin')}
              className="font-bold text-amber-300 hover:underline min-h-0 h-auto py-0"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};
