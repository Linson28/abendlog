const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'abend-log-secret-key-change-in-production';

// POST /api/auth/login
// Body: { user_id, password, login_mode }
const login = async (req, res, next) => {
  try {
    const { user_id, password, login_mode } = req.body;

    // Input validation
    if (!user_id || !password || !login_mode) {
      return res.status(400).json({ success: false, message: 'user_id, password, and login_mode are required.' });
    }
    if (!['admin', 'user'].includes(login_mode)) {
      return res.status(400).json({ success: false, message: 'login_mode must be "admin" or "user".' });
    }

    const pool = getPool();
    const result = await pool.request()
      .input('user_id', sql.NVarChar, user_id)
      .query('SELECT user_id, password_hash, role, display_name, is_active, must_reset_pw FROM users WHERE user_id = @user_id');

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = result.recordset[0];

    // Check active status
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact an administrator.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Check role for admin login mode
    if (login_mode === 'admin' && user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    // Update last_login_at
    await pool.request()
      .input('user_id', sql.NVarChar, user_id)
      .query('UPDATE users SET last_login_at = GETDATE() WHERE user_id = @user_id');

    // Build JWT payload
    const payload = {
      userId: user.user_id,
      role: user.role,
      login_mode,
      display_name: user.display_name
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    return res.status(200).json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        role: user.role,
        display_name: user.display_name,
        must_reset_pw: user.must_reset_pw,
        login_mode
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password  (requires authenticateToken)
// Body: { current_password, new_password }
const resetPassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.userId;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'current_password and new_password are required.' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const pool = getPool();
    const result = await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .query('SELECT password_hash FROM users WHERE user_id = @user_id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { password_hash } = result.recordset[0];

    const passwordMatch = await bcrypt.compare(current_password, password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(new_password, 12);

    await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .input('password_hash', sql.NVarChar, newHash)
      .query('UPDATE users SET password_hash = @password_hash, must_reset_pw = 0 WHERE user_id = @user_id');

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/users  (requires admin)
const getUsers = async (req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .query('SELECT user_id, role, display_name, is_active, must_reset_pw, last_login_at, created_at FROM users ORDER BY user_id');

    return res.status(200).json({ success: true, users: result.recordset });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/users  (requires admin)
// Body: { user_id, password, role, display_name }
const createUser = async (req, res, next) => {
  try {
    const { user_id, password, role, display_name } = req.body;

    if (!user_id || !password || !role || !display_name) {
      return res.status(400).json({ success: false, message: 'user_id, password, role, and display_name are required.' });
    }
    if (!['ADMIN', 'USER'].includes(role)) {
      return res.status(400).json({ success: false, message: 'role must be "ADMIN" or "USER".' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const pool = getPool();

    // Check if user_id already exists
    const existing = await pool.request()
      .input('user_id', sql.NVarChar, user_id)
      .query('SELECT user_id FROM users WHERE user_id = @user_id');

    if (existing.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'User ID already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    await pool.request()
      .input('user_id', sql.NVarChar, user_id)
      .input('password_hash', sql.NVarChar, password_hash)
      .input('role', sql.NVarChar, role)
      .input('display_name', sql.NVarChar, display_name)
      .query(`
        INSERT INTO users (user_id, password_hash, role, display_name, is_active, must_reset_pw)
        VALUES (@user_id, @password_hash, @role, @display_name, 1, 1)
      `);

    return res.status(201).json({ success: true, message: 'User created successfully.' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/users/:userId/force-reset  (requires admin)
// Body: { temp_password }
const forceResetUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { temp_password } = req.body;

    if (!temp_password) {
      return res.status(400).json({ success: false, message: 'temp_password is required.' });
    }
    if (temp_password.length < 8) {
      return res.status(400).json({ success: false, message: 'Temporary password must be at least 8 characters.' });
    }

    const pool = getPool();

    // Verify user exists
    const existing = await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .query('SELECT user_id FROM users WHERE user_id = @user_id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const password_hash = await bcrypt.hash(temp_password, 12);

    await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .input('password_hash', sql.NVarChar, password_hash)
      .query('UPDATE users SET password_hash = @password_hash, must_reset_pw = 1 WHERE user_id = @user_id');

    return res.status(200).json({ success: true, message: 'Password reset successfully. User must change password on next login.' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/users/:userId/toggle-active  (requires admin)
const toggleUserActive = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.userId;

    // Prevent admin from toggling their own account
    if (userId === adminId) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const pool = getPool();

    // Verify user exists
    const existing = await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .query('SELECT user_id FROM users WHERE user_id = @user_id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const result = await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .query('UPDATE users SET is_active = 1 - is_active OUTPUT INSERTED.is_active WHERE user_id = @user_id');

    const is_active = result.recordset[0].is_active;

    return res.status(200).json({ success: true, is_active });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/auth/users/:userId  (requires admin)
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.userId;

    // Prevent admin from deleting their own account
    if (userId === adminId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const pool = getPool();

    // Verify user exists
    const existing = await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .query('SELECT user_id FROM users WHERE user_id = @user_id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .query('DELETE FROM users WHERE user_id = @user_id');

    return res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  resetPassword,
  getUsers,
  createUser,
  forceResetUser,
  toggleUserActive,
  deleteUser,
};