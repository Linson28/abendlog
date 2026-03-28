import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SessionData } from '../types';
import { authService } from '../services/auth';

interface AuthContextType {
  session: SessionData | null;
  login: (user_id: string, password: string, login_mode: 'user' | 'admin') => Promise<void>;
  logout: () => void;
  clearMustResetPw: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionData | null>(() => {
    const s = authService.getSession();
    if (s && authService.isSessionExpired()) {
      authService.clearSession();
      return null;
    }
    return s;
  });

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);

  const login = useCallback(async (user_id: string, password: string, login_mode: 'user' | 'admin') => {
    const newSession = await authService.login(user_id, password, login_mode);
    setSession(newSession);
  }, []);

  const clearMustResetPw = useCallback(() => {
    setSession(prev => {
      if (!prev) return null;
      const updated = { ...prev, must_reset_pw: false };
      authService.setSession(updated);
      return updated;
    });
  }, []);

  // Listen for auth:expired event dispatched by api.ts on 401/403
  useEffect(() => {
    const handleExpiry = () => logout();
    window.addEventListener('auth:expired', handleExpiry);
    return () => window.removeEventListener('auth:expired', handleExpiry);
  }, [logout]);

  // Global activity tracking
  useEffect(() => {
    if (!session) return;
    const updateActivity = () => authService.updateActivity();
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [session]);

  // Session timeout check every minute
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      if (authService.isSessionExpired()) logout();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [session, logout]);

  return (
    <AuthContext.Provider value={{ session, login, logout, clearMustResetPw }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
