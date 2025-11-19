const express = require('express');

const {getReservations, getReservation, addReservation, updateReservation, deleteReservation, getReservationHistory, cancelReservation} = require('../controllers/reservations');

const router = express.Router({mergeParams: true});

const {protect, authorize} = require('../middleware/auth');

router.route('/').get(protect, getReservations).post(protect, authorize('admin', 'user'), addReservation);

router.route('/history').get(protect, getReservationHistory);

router.route('/:id').get(protect, getReservation).put(protect, authorize('admin', 'user'), updateReservation).delete(protect, authorize('admin', 'user'), deleteReservation);

router.route('/:id/cancel').put(protect, authorize('admin', 'user'), cancelReservation);

module.exports=router;
