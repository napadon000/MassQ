const mongoose = require('mongoose');

const MassageShopSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        unique: true,
        trim: true,
        maxlength: [50, 'Name cannot be more than 50 characters']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    tel: {
        type: String,
        required: [true, 'Please add a telephone number']
    },
    openTime: {
        type: String,
        required: [true, 'Please add opening time'],
        //validate openTime is xx:xx 24hours format
        match: [
            /^([01]\d|2[0-3]):([0-5]\d)$/,
            'Please add a valid opening time in HH:MM 24-hour format'
        ]
    },
    closeTime: {
        type: String,
        required: [true, 'Please add closing time'],
        match: [
                    /^([01]\d|2[0-3]):([0-5]\d)$/,
                    'Please add a valid opening time in HH:MM 24-hour format'
                ]
    },
    slotDuration: {
        type: Number,
        required: [true, 'Please add slot duration in minutes'],
        enum: [30, 60, 90, 120],
        default: 60
    },
    timeslotCapacity: {
        type: Number,
        required: [true, 'Please add timeslot capacity'],
        min: [1, 'Timeslot capacity must be at least 1']
    },
}, {
    toJSON: {virtuals:true},
    toObject : {virtuals:true}
});

//Reverse populate with virtuals
MassageShopSchema.virtual('reservations', {
    ref: 'Reservation',
    localField: '_id',
    foreignField: 'massageShop',
    justOne: false
});

MassageShopSchema.virtual('reviews', {
  ref: 'History',
  localField: '_id',
  foreignField: 'massageShop',
  justOne: false
})

module.exports = mongoose.model('MassageShop', MassageShopSchema);
