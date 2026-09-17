import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ChargingSession } from '../types';
import {
  loginUser,
  registerUser,
  fetchCurrentUser,
  fetchActiveChargingSession,
  updateUserProfile
} from '../services/api';

interface AuthContextType {
  user: User | null;
  activeSession: ChargingSession | null;
  currentPage: string;
  pageParams: any;
  loading: boolean;
  error: string | null;
  setCurrentPage: (page: string, params?: any) => void;
  login: (identifier: string, pass: string) => Promise<User>;
  register: (fullName: string, username: string, email: string, pass: string) => Promise<User>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('ecocharge_user');
      const token = localStorage.getItem('ecocharge_token');
      // Only restore session if both user and token exist
      if (saved && token) return JSON.parse(saved) as User;
      // Clear stale user without token
      if (saved && !token) localStorage.removeItem('ecocharge_user');
      return null;
    } catch {
      return null;
    }
  });

  const [activeSession, setActiveSession] = useState<ChargingSession | null>(null);
  const [currentPage, setCurrentPageRaw]  = useState<string>(() => {
    // If a valid saved session exists, start on the correct console page
    try {
      const saved  = localStorage.getItem('ecocharge_user');
      const token  = localStorage.getItem('ecocharge_token');
      if (saved && token) {
        const u = JSON.parse(saved) as User;
        return u.role === 'admin' ? 'admin' : 'dashboard';
      }
    } catch { /* ignore */ }
    return 'landing';
  });
  const [pageParams, setPageParams]       = useState<any>(null);
  const [loading, setLoading]             = useState<boolean>(false);
  const [error, setError]                 = useState<string | null>(null);

  const setCurrentPage = (page: string, params?: any) => {
    setCurrentPageRaw(page);
    setPageParams(params ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Refresh user + active session from .NET backend every 5 s ────────────
  const refreshUserData = async () => {
    if (!user) return;
    try {
      const res = await fetchCurrentUser(user.userId);
      const updated = res.user;
      setUser(updated);
      localStorage.setItem('ecocharge_user', JSON.stringify(updated));

      const sessionRes = await fetchActiveChargingSession(user.userId);
      setActiveSession(sessionRes.activeSession);
    } catch (err) {
      // Token may be expired — silently ignore on background refresh
      console.warn('Background refresh failed:', err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshUserData();
      const interval = setInterval(refreshUserData, 5000);
      return () => clearInterval(interval);
    } else {
      setActiveSession(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = async (identifier: string, pass: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      // api.ts saves the JWT token to localStorage automatically
      const res = await loginUser({ identifier, password: pass });
      setUser(res.user);
      localStorage.setItem('ecocharge_user', JSON.stringify(res.user));
      setCurrentPage(res.user.role === 'admin' ? 'admin' : 'dashboard');
      return res.user;
    } catch (err: any) {
      setError(err.message ?? 'Login failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    fullName: string,
    username: string,
    email: string,
    pass: string
  ): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const res = await registerUser({ fullName, username, email, password: pass });
      setUser(res.user);
      localStorage.setItem('ecocharge_user', JSON.stringify(res.user));
      setCurrentPage('dashboard');
      return res.user;
    } catch (err: any) {
      setError(err.message ?? 'Registration failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setActiveSession(null);
    // Clear both the user object and the JWT token
    localStorage.removeItem('ecocharge_user');
    localStorage.removeItem('ecocharge_token');
    setCurrentPage('landing');
  };

  const updateProfile = async (data: any) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await updateUserProfile(user.userId, data);
      setUser(res.user);
      localStorage.setItem('ecocharge_user', JSON.stringify(res.user));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeSession,
        currentPage,
        pageParams,
        loading,
        error,
        setCurrentPage,
        login,
        register,
        logout,
        refreshUserData,
        updateProfile,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
