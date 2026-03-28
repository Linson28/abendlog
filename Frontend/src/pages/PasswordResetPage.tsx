import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';

const EyeIcon: React.FC<{ visible: boolean }> = ({ visible }) => visible ? (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

// Password strength: 0-4
const getStrength = (pw: string): number => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['bg-red-400', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-500'];

const PwInput: React.FC<{
  id: string; value: string; onChange: (v: string) => void;
  showPw: boolean; onToggle: () => void; placeholder: string; autoComplete: string;
}> = ({ id, value, onChange, showPw, onToggle, placeholder, autoComplete }) => (
  <div className="relative">
    <input
      id={id}
      type={showPw ? 'text' : 'password'}
      value={value}
      onChange={e => onChange(e.target.value)}
      required
      autoComplete={autoComplete}
      placeholder={placeholder}
      className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-indigo-400 transition-colors text-slate-900 placeholder-slate-400"
    />
    <button type="button" onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
      <EyeIcon visible={showPw} />
    </button>
  </div>
);

const PasswordResetPage: React.FC = () => {
  const { session, clearMustResetPw, logout } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = getStrength(newPw);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPw.length < 8) return setError('New password must be at least 8 characters.');
    if (newPw !== confirmPw) return setError('Passwords do not match.');
    if (newPw === currentPw) return setError('New password must be different from the current password.');

    setLoading(true);
    try {
      await authService.resetPassword(currentPw, newPw);
      clearMustResetPw();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (field: 'current' | 'new' | 'confirm') =>
    setShow(s => ({ ...s, [field]: !s[field] }));

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" style={{ animation: 'zoomIn 0.3s ease-out' }}>
        {/* Header */}
        <div className="px-8 pt-10 pb-6 bg-gradient-to-br from-amber-500 to-orange-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <i className="fa-solid fa-key text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Password Reset Required</h1>
              <p className="text-white/70 text-sm">Change your password before continuing</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Info banner */}
          <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 flex-shrink-0 text-sm"></i>
            <p className="text-amber-800 text-sm">
              Welcome, <strong>{session?.display_name || session?.user_id}</strong>. For security, you must set a new password.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5 flex-shrink-0"></i>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPw" className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
              <PwInput id="currentPw" value={currentPw} onChange={setCurrentPw}
                showPw={show.current} onToggle={() => toggle('current')}
                placeholder="Your current password" autoComplete="current-password" />
            </div>

            <div>
              <label htmlFor="newPw" className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
              <PwInput id="newPw" value={newPw} onChange={setNewPw}
                showPw={show.new} onToggle={() => toggle('new')}
                placeholder="At least 8 characters" autoComplete="new-password" />
              {newPw && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i < strength ? strengthColor[strength] : 'bg-slate-200'
                      }`} />
                    ))}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${
                    strength <= 1 ? 'text-red-500' : strength <= 2 ? 'text-amber-500' : strength <= 3 ? 'text-blue-500' : 'text-green-600'
                  }`}>{strengthLabel[strength]}</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPw" className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
              <PwInput id="confirmPw" value={confirmPw} onChange={setConfirmPw}
                showPw={show.confirm} onToggle={() => toggle('confirm')}
                placeholder="Re-enter new password" autoComplete="new-password" />
              {confirmPw && newPw && (
                <p className={`mt-1 text-xs font-medium ${newPw === confirmPw ? 'text-green-600' : 'text-red-500'}`}>
                  {newPw === confirmPw ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                <><i className="fa-solid fa-shield-check"></i> Set New Password</>
              )}
            </button>
          </form>

          <button
            onClick={logout}
            className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i>
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage;
