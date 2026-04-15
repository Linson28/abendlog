import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import type { User } from '../types';

const Spinner: React.FC<{ size?: string }> = ({ size = 'h-5 w-5' }) => (
  <svg className={`animate-spin ${size}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
  </svg>
);

const AdminConsolePage: React.FC = () => {
  const { session, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Add User modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ user_id: '', display_name: '', password: '', role: 'USER' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Force Reset modal state
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // Toast
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setFetchError('');
    try {
      const data = await authService.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (addForm.password.length < 8) { setAddError('Password must be at least 8 characters.'); return; }
    setAddLoading(true);
    try {
      await authService.createUser(addForm.user_id, addForm.password, addForm.role, addForm.display_name);
      await fetchUsers();
      setShowAddModal(false);
      setAddForm({ user_id: '', display_name: '', password: '', role: 'USER' });
      showToast('User created successfully.');
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleForceReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError('');
    if (tempPassword.length < 8) { setResetError('Password must be at least 8 characters.'); return; }
    setResetLoading(true);
    try {
      await authService.forceResetUser(resetTarget.user_id, tempPassword);
      await fetchUsers();
      setResetTarget(null);
      setTempPassword('');
      showToast(`Temporary password set for ${resetTarget.display_name || resetTarget.user_id}.`);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Delete "${user.display_name || user.user_id}"? This cannot be undone.`)) return;
    try {
      await authService.deleteUser(user.user_id);
      await fetchUsers();
      showToast(`${user.display_name || user.user_id} has been deleted.`);
    } catch (err: unknown) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const openResetModal = (user: User) => {
    setResetTarget(user);
    setTempPassword('');
    setResetError('');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-shield-halved text-white"></i>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">ADMIN DASHBOARD</h1>
            <p className="text-xs text-slate-500">Abend Log Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{session?.display_name || session?.user_id}</p>
            <span className="inline-block text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">User Directory</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {loadingUsers ? 'Loading...' : `${users.length} account${users.length !== 1 ? 's' : ''} registered`}
            </p>
          </div>
          <button
            onClick={() => { setShowAddModal(true); setAddError(''); setAddForm({ user_id: '', display_name: '', password: '', role: 'USER' }); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <i className="fa-solid fa-user-plus"></i>
            <span>Add User</span>
          </button>
        </div>

        {/* Table / Loading / Error */}
        {loadingUsers ? (
          <div className="flex justify-center items-center py-24 text-purple-600">
            <Spinner size="h-8 w-8" />
          </div>
        ) : fetchError ? (
          <div className="text-center py-20">
            <i className="fa-solid fa-triangle-exclamation text-4xl text-red-400 mb-3"></i>
            <p className="text-red-600 font-medium">{fetchError}</p>
            <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors">
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pw Reset</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(user => (
                    <tr key={user.user_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {(user.display_name || user.user_id).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{user.display_name || user.user_id}</p>
                            <p className="text-xs text-slate-500 font-mono">{user.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          user.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                          {user.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatDate(user.last_login_at)}</td>
                      <td className="px-6 py-4">
                        {user.must_reset_pw ? (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Pending</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openResetModal(user)}
                            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Force Reset
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.user_id === session?.user_id}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100"
                          >
                            <i className="fa-solid fa-trash mr-1"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(false); } }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" style={{ animation: 'zoomIn 0.2s ease-out' }}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Add New User</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleAddUser} className="px-6 py-5 space-y-4">
              {addError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{addError}</div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">User ID <span className="text-red-500">*</span></label>
                <input type="text" required value={addForm.user_id}
                  onChange={e => setAddForm(f => ({ ...f, user_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:outline-none text-slate-900 transition-colors"
                  placeholder="e.g. jsmith" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Display Name</label>
                <input type="text" value={addForm.display_name}
                  onChange={e => setAddForm(f => ({ ...f, display_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:outline-none text-slate-900 transition-colors"
                  placeholder="e.g. John Smith" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role <span className="text-red-500">*</span></label>
                <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:outline-none text-slate-900 bg-white transition-colors">
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Temporary Password <span className="text-red-500">*</span></label>
                <input type="password" required value={addForm.password}
                  onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:outline-none text-slate-900 transition-colors"
                  placeholder="Min. 8 characters" />
                <p className="text-xs text-slate-400 mt-1">User will be required to change this on first login.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {addLoading ? <Spinner /> : <><i className="fa-solid fa-user-plus"></i> Create User</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Force Reset Modal */}
      {resetTarget && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
          onClick={e => { if (e.target === e.currentTarget) setResetTarget(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm" style={{ animation: 'zoomIn 0.2s ease-out' }}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Force Password Reset</h3>
              <button onClick={() => setResetTarget(null)} className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleForceReset} className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {(resetTarget.display_name || resetTarget.user_id).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{resetTarget.display_name || resetTarget.user_id}</p>
                  <p className="text-xs text-slate-500 font-mono">{resetTarget.user_id}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Set a temporary password. The user will be forced to change it on their next login.
              </p>
              {resetError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{resetError}</div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Temporary Password</label>
                <input type="password" required value={tempPassword}
                  onChange={e => setTempPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none text-slate-900 transition-colors"
                  placeholder="Min. 8 characters" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setResetTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={resetLoading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {resetLoading ? <Spinner /> : <><i className="fa-solid fa-key"></i> Set Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium z-50 flex items-center gap-2"
          style={{ animation: 'slideInFromRight 0.3s ease-out' }}
        >
          <i className="fa-solid fa-circle-check text-green-400"></i>
          {toast}
        </div>
      )}
    </div>
  );
};

export default AdminConsolePage;