const express = require('express');
const {
    getHistories,
    getHistory,
    createHistory,
    updateHistory,
} = require('../controllers/histories');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);


router.route('/').get(getHistories).post(protect, authorize('admin'), createHistory);
router.route('/:id').get(getHistory).put(protect, authorize('admin', 'user'), updateHistory);

module.exports = router;
