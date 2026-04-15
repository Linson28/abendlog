import type { SessionData, User } from '../types';

const SESSION_KEY = 'abend_session';
const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const authService = {
  getSession(): SessionData | null {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as SessionData; } catch { return null; }
  },

  setSession(session: SessionData): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
  },

  updateActivity(): void {
    const session = this.getSession();
    if (!session) return;
    session.last_activity_at = new Date().toISOString();
    this.setSession(session);
  },

  isSessionExpired(): boolean {
    const session = this.getSession();
    if (!session) return true;
    const lastActivity = new Date(session.last_activity_at).getTime();
    return Date.now() - lastActivity > TIMEOUT_MS;
  },

  getToken(): string | null {
    return this.getSession()?.token ?? null;
  },

  async login(user_id: string, password: string, login_mode: 'user' | 'admin'): Promise<SessionData> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, password, login_mode }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed.');

    const session: SessionData = {
      user_id: data.user.user_id,
      role: data.user.role,
      login_mode: data.user.login_mode,
      login_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      token: data.token,
      display_name: data.user.display_name || data.user.user_id,
      must_reset_pw: Boolean(data.user.must_reset_pw),
    };
    this.setSession(session);
    return session;
  },

  logout(): void {
    this.clearSession();
  },

  async resetPassword(current_password: string, new_password: string): Promise<void> {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ current_password, new_password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Password reset failed.');
    // Clear the must_reset_pw flag in session
    const session = this.getSession();
    if (session) { session.must_reset_pw = false; this.setSession(session); }
  },

  async getUsers(): Promise<User[]> {
    const response = await fetch('/api/auth/users', {
      headers: { 'Authorization': `Bearer ${this.getToken()}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch users.');
    return data.users;
  },

  async createUser(user_id: string, password: string, role: string, display_name: string): Promise<void> {
    const response = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
      body: JSON.stringify({ user_id, password, role, display_name }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create user.');
  },

  async forceResetUser(userId: string, temp_password: string): Promise<void> {
    const response = await fetch(`/api/auth/users/${encodeURIComponent(userId)}/force-reset`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
      body: JSON.stringify({ temp_password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to force reset.');
  },

  async toggleUserActive(userId: string): Promise<{ is_active: boolean }> {
    const response = await fetch(`/api/auth/users/${encodeURIComponent(userId)}/toggle-active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to toggle user status.');
    return data;
  },

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`/api/auth/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.getToken()}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to delete user.');
  },
};