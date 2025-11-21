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
        enum: ['completed', 'cancelled'],
        required: true
    },
    // endedAt: {
    //     type: Date,
    //     default: Date.now
    // },
    review: {
      type: String,
      default: null
    },
    rating: {
      type: Number,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating cannot be more than 5'],
      default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('History', HistorySchema);
