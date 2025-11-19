const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    reservationDate: {
        type: Date,
        required: [true, 'Please specify reservation date and time']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    massageShop: {
        type: mongoose.Schema.ObjectId,
        ref: 'MassageShop',
        required: true
    },
    // isWaitlist: {
    //     type: Boolean,
    //     default: false
    // },
    waitlistPosition: {
        type: Number,
    },
    status: {
        type: String,
        enum: ['confirmed','completed', 'cancelled', 'waitlisted'],
        default: 'confirmed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Reservation', ReservationSchema);
