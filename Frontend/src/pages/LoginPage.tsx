import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type LoginMode = 'user' | 'admin';

// Inline SVG eye icon (password toggle)
const EyeIcon: React.FC<{ visible: boolean }> = ({ visible }) => visible ? (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState<LoginMode>('user');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const isAdmin = mode === 'admin';

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(userId, password, mode);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: LoginMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'zoomIn 0.3s ease-out' }}
      >
        {/* Gradient header */}
        <div className={`px-8 pt-10 pb-6 transition-all duration-300 ${
          isAdmin
            ? 'bg-gradient-to-br from-purple-600 to-purple-800'
            : 'bg-gradient-to-br from-indigo-600 to-indigo-800'
        }`}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <i className={`fa-solid ${isAdmin ? 'fa-shield-halved' : 'fa-terminal'} text-white text-lg`}></i>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Abend Log</h1>
              <p className="text-white/70 text-sm font-medium">Log Management System</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Tab Selector */}
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
            <button
              onClick={() => handleModeChange('user')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                !isAdmin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <i className="fa-solid fa-user mr-2"></i>
              User Login
            </button>
            <button
              onClick={() => handleModeChange('admin')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isAdmin ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <i className="fa-solid fa-shield-halved mr-2"></i>
              Admin Login
            </button>
          </div>

          {/* Error Box */}
          {error && (
            <div className={`mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 ${shake ? 'animate-shake' : ''}`}>
              <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5 flex-shrink-0"></i>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                required
                autoComplete="username"
                className={`w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none transition-colors text-slate-900 placeholder-slate-400 ${
                  isAdmin ? 'focus:border-purple-400' : 'focus:border-indigo-400'
                }`}
                placeholder="Enter your user ID"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 focus:outline-none transition-colors text-slate-900 placeholder-slate-400 ${
                    isAdmin ? 'focus:border-purple-400' : 'focus:border-indigo-400'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                isAdmin
                  ? 'bg-purple-600 hover:bg-purple-700 active:scale-[0.99]'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  <i className={`fa-solid ${isAdmin ? 'fa-shield-halved' : 'fa-arrow-right-to-bracket'}`}></i>
                  {isAdmin ? 'Access Admin Console' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {isAdmin && (
            <p className="mt-4 text-center text-xs text-slate-400">
              <i className="fa-solid fa-lock mr-1"></i>
              Admin access requires elevated privileges
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
