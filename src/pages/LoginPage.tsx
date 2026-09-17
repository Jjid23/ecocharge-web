import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, Eye, EyeOff, LogIn, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import { Footer } from '../components/Footer';

export const LoginPage: React.FC = () => {
  const { login, setCurrentPage, loading, error, clearError } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try { await login(identifier, password); } catch { /* handled in context */ }
  };

  const handleSendReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetEmailSent(true);
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 px-5 py-8 flex flex-col justify-center gap-6">

        {/* Logo + header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl">
            <Leaf className="w-9 h-9 text-emerald-950 fill-current" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Welcome Back</h2>
            <p className="text-xs text-emerald-200/70 mt-1">Sign in to your EcoCharge account</p>
          </div>
          {/* eco stat teaser */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-xs text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Earn points with every bottle you recycle</span>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-emerald-900/40 border border-emerald-800/80 rounded-3xl p-5 shadow-2xl space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                Email or Username
              </label>
              <input
                id="signin-identifier"
                type="text"
                required
                placeholder="user@ecocharge.org or alexm"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white p-1 min-h-0 h-auto"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                id="forgot-password-link"
                onClick={() => { setForgotModalOpen(true); setResetEmailSent(false); }}
                className="text-xs text-emerald-400 hover:text-emerald-200 underline min-h-0 h-auto py-0"
              >
                Forgot Password?
              </button>
            </div>

            <button
              id="submit-signin-btn"
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-emerald-950 font-extrabold text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
            >
              <LogIn className="w-5 h-5" />
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Register link */}
        <div className="text-center">
          <p className="text-sm text-emerald-200/80">
            Don't have an account?{' '}
            <button
              id="signin-to-register-link"
              onClick={() => setCurrentPage('register')}
              className="font-bold text-amber-300 hover:underline min-h-0 h-auto py-0"
            >
              Create one free
            </button>
          </p>
        </div>
      </div>

      <Footer />

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-emerald-950 border border-emerald-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-white">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold">Reset Password</h3>
            </div>

            {!resetEmailSent ? (
              <form onSubmit={handleSendReset} className="space-y-3">
                <p className="text-xs text-emerald-200/80">
                  Enter your email and we'll send a reset link.
                </p>
                <input
                  type="email"
                  required
                  placeholder="user@ecocharge.org"
                  value={resetEmailInput}
                  onChange={(e) => setResetEmailInput(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-emerald-900/60 border border-emerald-700 text-white"
                />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setForgotModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-emerald-900 text-emerald-200 text-sm font-bold">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-500 text-emerald-950 text-sm font-extrabold">
                    Send Link
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">✓</div>
                <h4 className="text-sm font-bold text-white">Reset Link Sent!</h4>
                <p className="text-xs text-emerald-200/80">
                  If an account exists for <strong>{resetEmailInput}</strong>, instructions have been sent.
                </p>
                <button onClick={() => setForgotModalOpen(false)}
                  className="w-full py-3 rounded-xl bg-emerald-700 text-white text-sm font-bold">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
