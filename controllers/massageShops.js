const MassageShop = require('../models/MassageShop');
const Reservation = require('../models/Reservation');
const History = require('../models/History');

const generateTimeslots = (openTime, closeTime, capacity, slotDuration) => {
    const timeslots = [];
    const [ openHour, openMinute ] = openTime.split(':').map(Number);
    const [ closeHour, closeMinute ] = closeTime.split(':').map(Number);

    // Convert to minutes from midnight
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    // Generate slots based on duration
    for (let currentMinutes = openMinutes; currentMinutes < closeMinutes; currentMinutes += slotDuration) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        timeslots.push({
            time: timeString,
            capacity: capacity,
            available: capacity,
            waitinglist: 0,
        });
    }

    return timeslots;
};

const checkTimeslotAvailability = async (massageShopId, date, timeslots) => {
    // Get all confirmed  reservations for this shop off this date
    // e.g. ?date=2025-10-23
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await Reservation.find({
        massageShop: massageShopId,
        reservationDate: { $gte: startOfDay, $lte: endOfDay },
        // status: 'confirmed',
        isWaitlist: false
    });

    const waitlistReservations = await Reservation.find({
        massageShop: massageShopId,
        reservationDate: { $gte: startOfDay, $lte: endOfDay },
        isWaitlist: true
    });

    // console.log(reservations);
    // Count reservations per timeslot (extract hour and minute from reservationDate)
    const timeslotCounts = {};
    reservations.forEach(reservation => {
        const resDate = new Date(reservation.reservationDate);
        const hour = resDate.getUTCHours();
        const minute = resDate.getUTCMinutes();
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        timeslotCounts[timeString] = (timeslotCounts[timeString] || 0) + 1;
    });
    // console.log(timeslotCounts);
  const waitCounts = {};
  waitlistReservations.forEach(reservation => {
    const resDate = new Date(reservation.reservationDate);
    const hour = resDate.getUTCHours();
    const minute = resDate.getUTCMinutes();
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    waitCounts[timeString] = (waitCounts[timeString] || 0) + 1;
  });
    // Update available capacity
    return timeslots.map(slot => ({
        ...slot,
        available: slot.capacity - (timeslotCounts[slot.time] || 0),
        waitinglist: waitCounts[slot.time] || 0,
        // isFull: (slot.capacity - (timeslotCounts[slot.time] || 0)) <= 0
    }));
};

const getRating = async (messageShopId) => {
  const ratings = await History.find({
    massageShop: messageShopId,
    rating: { $ne: null }
  }).select('rating -_id');

  if (ratings.length === 0) {
    return null;
  }
  const total = ratings.reduce((sum, record) => sum + record.rating, 0);
  return total / ratings.length;
};

//@desc Get all massage shops
//@route GET /api/v1/massageshops
//@access Public
exports.getMassageShops = async(req, res, next) => {
    let query;

    //copy req.query
    const reqQuery = {...req.query};

    //Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];
    // console.log(req.query);

    //Loop over remove fields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);
    console.log(reqQuery);

    //create query string
    let queryStr = JSON.stringify(reqQuery);

    //create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    //finding resource
    if (req.user && req.user.role === 'admin') {
      query = MassageShop.find(JSON.parse(queryStr)).populate([
        {
          path: 'reservations'
        },
        {
          path: 'reviews',
          match: {
            status: 'completed',
            review: { $ne: null },
          },
          select: 'review -massageShop',
        },
      ]);
    } else {
      query = MassageShop.find(JSON.parse(queryStr)).populate([
        {
          path: 'reviews',
          match: {
            status: 'completed',
            review: { $ne: null },
          },
          select: 'review -_id -massageShop',
      }]);
    }

    //select Fields
    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    //sort
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    }
    else {
        query = query.sort('-createdAt');
    }

    //Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit,10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;


    try {
        const total = await MassageShop.countDocuments();
        query = query.skip(startIndex).limit(limit);
        //Execute query
        const massageShops = await query;
        //Pagination result
        const pagination = {};

        if (endIndex<total) {
            pagination.next = {
                page:page+1,
                limit
            }
        }

        if (startIndex>0) {
            pagination.prev={
                page:page-1,
                limit
            }
        }

        //add rating for each massage shop
        for (let i = 0; i < massageShops.length; i++) {
          const rating = await getRating(massageShops[i]._id);
          massageShops[i] = massageShops[i].toObject();
          massageShops[i].rating = rating;
        };

        res.status(200).json({
            success: true,
            count: massageShops.length,
            pagination,
            data: massageShops
        });
    } catch (error) {
        res.status(400).json({success: false});
    }
};

//@desc Get single massage shop
//@route GET /api/v1/massageshops/:id
//@access Public
exports.getMassageShop = async (req, res, next) => {
    try {
        const massageShop = await MassageShop.findById(req.params.id);

        if (!massageShop) {
            return res.status(404).json({success: false, message: 'Massage shop not found'});
        }

        let timeslotsWithAvailability = null;
        if (req.query.date) {
          // Generate timeslots with custom duration
          const timeslots = generateTimeslots(
              massageShop.openTime,
              massageShop.closeTime,
              massageShop.timeslotCapacity,
              massageShop.slotDuration
          );

          //validate query.date = yaer-month-day formation only
          if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
              return res.status(400).json({success: false, message: 'Invalid date format. Use YYYY-MM-DD.'});
          }
            timeslotsWithAvailability = await checkTimeslotAvailability(
                massageShop._id,
                req.query.date,
                timeslots
            );
        };

        res.status(200).json({
            success: true,
            data: {
                ...massageShop.toObject(),
                timeslots: timeslotsWithAvailability
            }
        });
    } catch (error) {
        res.status(400).json({success: false, message: error.message});
    }
};

//@desc Create new massage shop
//@route POST /api/v1/massageshops
//@access Private (Admin only)
exports.createMassageShop = async (req, res, next) => {
    try {
        const massageShop = await MassageShop.create(req.body);
        res.status(201).json({
            success: true,
            data: massageShop
        });
    } catch (error) {
        res.status(400).json({success: false, message: error.message});
    }
};

//@desc Update massage shop
//@route PUT /api/v1/massageshops/:id
//@access Private (Admin only)
exports.updateMassageShop = async (req, res, next) => {
    try {
        const massageShop = await MassageShop.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!massageShop) {
            return res.status(404).json({success: false, message: 'Massage shop not found'});
        }
        res.status(200).json({
            success: true,
            data: massageShop
        });
    } catch (error) {
        res.status(400).json({success: false});
    }
};

//@desc Delete massage shop
//@route DELETE /api/v1/massageshops/:id
//@access Private (Admin only)
exports.deleteMassageShop = async (req, res, next) => {
    try {
        const massageShop = await MassageShop.findById(req.params.id);

        if(!massageShop) {
            return res.status(404).json({success: false, message: 'Massage shop not found'});
        }

        // Delete all reservations associated with this massage shop
        await Reservation.deleteMany({ massageShop: req.params.id});
        await MassageShop.deleteOne({_id: req.params.id});

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(400).json({success: false});
    }
};
