const express = require('express');
const router = express.Router();
const abendController = require('../controllers/abendController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// GET /api/abend - Get abend logs with filters
router.get('/', abendController.getAbendLogs);

// GET /api/abend/next-log-number - Get the next log number for a given year
router.get('/next-log-number', abendController.getNextLogNumber);

// GET /api/abend/:year/:log_number - Get single abend log by year and number
router.get('/:year/:log_number', abendController.getAbendLogByYearAndNumber);

// POST /api/abend - Create new abend log entry
router.post('/', abendController.createAbendLog);

// PUT /api/abend/:year/:log_number - Update abend log entry
router.put('/:year/:log_number', abendController.updateAbendLog);

// DELETE /api/abend/:year/:log_number - Delete abend log entry
router.delete('/:year/:log_number', abendController.deleteAbendLog);

module.exports = router;
