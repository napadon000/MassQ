const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
    reservationDate: {
        type: Date,
        required: true
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
    reservation: {
        type: mongoose.Schema.ObjectId,
        required: true
    },
    status: {
        type: String,
        enum: ['completed', 'cancelled', 'no-show'],
        required: true
    },
    endedAt: {
        type: Date,
        default: Date.now
    },
    // review: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('History', HistorySchema);
