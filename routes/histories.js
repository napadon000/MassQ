const express = require('express');
const {
    getHistories,
    getHistory,
    createHistory,
    updateHistory,
    deleteHistory
} = require('../controllers/histories');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// GET all histories (user gets their own, admin gets all)
// POST create history (admin only)
router.route('/').get(getHistories).post(authorize('admin'), createHistory);

// GET single history (user can get their own, admin can get any)
// PUT update history (admin only)
// DELETE delete history (admin only)
router.route('/:id').get(getHistory).put(authorize('admin'), updateHistory).delete(deleteHistory);

module.exports = router;
