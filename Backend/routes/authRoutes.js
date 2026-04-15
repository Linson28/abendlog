const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Public
router.post('/login', authController.login);

// Authenticated
router.post('/reset-password', authenticateToken, authController.resetPassword);

// Admin only
router.get('/users', authenticateToken, requireAdmin, authController.getUsers);
router.post('/users', authenticateToken, requireAdmin, authController.createUser);
router.put('/users/:userId/force-reset', authenticateToken, requireAdmin, authController.forceResetUser);
router.put('/users/:userId/toggle-active', authenticateToken, requireAdmin, authController.toggleUserActive);
router.delete('/users/:userId', authenticateToken, requireAdmin, authController.deleteUser);

module.exports = router;