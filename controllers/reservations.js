const Reservation = require('../models/Reservation');
const MassageShop = require('../models/MassageShop');


const promoteWaitlist = async (massageShopId, reservationDate, waitlistPosition) => {
    try {
        const massageShop = await MassageShop.findById(massageShopId);
        if (!massageShop) return;

        const startOfSlot = new Date(reservationDate);

        const confirmedReservations = await Reservation.countDocuments({
            massageShop: massageShopId,
            reservationDate: startOfSlot,
            status: 'confirmed',
        });

        // console.log("yes)")
        const result = await Reservation.updateMany(
          {
            messageShop: massageShopId,
            status: 'waitlisted',
            reservationDate: startOfSlot,
            waitlistPosition: { $gt: waitlistPosition }
          },
          {
            $inc: { waitlistPosition: -1 },
          }
        )
        console.log(result);

        await Reservation.updateOne(
          {
            massageShop: massageShopId,
            status: 'waitlisted',
            waitlistPosition: 0,
            reservationDate: startOfSlot,
          },
          {
            $set: { status: 'confirmed'},
            $unset: { waitlistPosition: "" }
            }
        )

    } catch (error) {
        console.error('Error promoting waitlist:', error);
    }
};

//@desc Get all reservations (active only)
//@route GET /api/v1/reservations
//@access Private
exports.getReservations = async (req, res, next) => {
    let query;

    //General users can see only their active reservations
    if (req.user.role !== 'admin') {
        query = Reservation.find({
            user: req.user.id,
            status: {$in: ['confirmed', 'waitlisted'] },
        }).populate({
            path: 'massageShop',
            select: 'name address tel openTime closeTime waiatlistPosition'
        });
    } else { // If you are an admin you can see all active reservations
        if (req.params.massageShopId) {
            console.log(req.params.massageShopId);
            query = Reservation.find({
                massageShop: req.params.massageShopId,
                status: {$in: ['confirmed', 'waitlisted'] },
            }).populate({
                path: 'massageShop',
                select: 'name address tel openTime closeTime waiatlistPosition'
            });
        } else {
            query = Reservation.find({
                status:  {$in: ['confirmed', 'waitlisted'] }
            }).populate({
                path: 'massageShop',
                select: 'name address tel openTime closeTime waiatlistPosition'
            });
        }
    }
    try {
        const reservations = await query;

        res.status(200).json({
            success:true,
            count:reservations.length,
            data:reservations
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Cannot find Reservation"
        });
    }

};

//@desc Get reservation history (all reservations)
//@route GET /api/v1/reservations/history
//@access Private
exports.getReservationHistory = async (req, res, next) => {
    try {
        let query;

        //General users can see only their reservation history
        if (req.user.role !== 'admin') {
            query = Reservation.find({ user: req.user.id }).populate({
                path: 'massageShop',
                select: 'name address tel openTime closeTime'
            }).sort('-createdAt');
        } else {
            // Admin can see all reservation history
            query = Reservation.find().populate({
                path: 'massageShop',
                select: 'name address tel openTime closeTime'
            }).sort('-createdAt');
        }

        const reservations = await query;

        res.status(200).json({
            success: true,
            count: reservations.length,
            data: reservations
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Cannot find Reservation History"
        });
    }
};

//@desc Get single reservation
//@route GET /api/v1/reservations/:id
//@access Private
exports.getReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate({
            path: 'massageShop',
            select: 'name address tel openTime closeTime'
        });

        if (!reservation) {
            return res.status(404).json({success:false, message:`No reservation with the id of ${req.params.id}`});
        }

        //Make sure user is the reservation owner or admin
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to view this reservation`
            });
        }

        res.status(200).json({
            success:true,
            data: reservation
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Cannot find Reservation"
        });
    }
};

//@desc Add reservation
//@route POST /api/v1/massageshops/:massageShopId/reservations
//@access Private
exports.addReservation = async (req, res, next) => {
    try {

        req.body.massageShop = req.params.massageShopId;

        const massageShop = await MassageShop.findById(req.params.massageShopId);

        if(!massageShop) {
            return res.status(404).json({
                success: false,
                message: `No massage shop with the id of ${req.params.massageShopId}`
            });
        }

        //Validate reservationDate includes time
        const reservationDate = new Date(req.body.reservationDate);
        // console.log('Reservation Date Input:', req.body.reservationDate);
        // const resHour = reservationDate.getHours();
        // const resMinute = reservationDate.getMinutes();
        const resSeconds = reservationDate.getSeconds();

        //Validate seconds must be 0
        if (resSeconds !== 0) {
            return res.status(400).json({
                success: false,
                message: 'Reservation time seconds must be 00'
            });
        }

        //Get shop's slot duration
        const slotDuration = massageShop.slotDuration; // in minutes (30, 60, 90, 120)

        //Validate time matches the slot duration pattern
        const [openHour, openMinute] = massageShop.openTime.split(':').map(Number);
        const [closeHour, closeMinute] = massageShop.closeTime.split(':').map(Number);
        console.log(closeHour);
        console.log(massageShop.closeTime);

        const openTime = new Date(reservationDate);
        const closeTime = new Date(reservationDate);
        openTime.setUTCHours(openHour);
        openTime.setUTCMinutes(openMinute);
        closeTime.setUTCHours(closeHour);
        closeTime.setUTCMinutes(closeMinute);


        // Convert reservation time and shop times to minutes from midnight
        // const resMinutesFromMidnight = resHour * 60 + resMinute;
        // const openMinutesFromMidnight = openHour * 60 + openMinute;
        // const closeMinutesFromMidnight = closeHour * 60 + closeMinute;

        //Check if time is within shop hours
        console.log('Reservation Date:', reservationDate);
        console.log('Open Time:', openTime);
        console.log('Close Time:', closeTime);
        console.log(reservationDate < openTime);
        console.log(reservationDate >= closeTime);
        if (reservationDate < openTime || reservationDate >= closeTime) {
            return res.status(400).json({
                success: false,
                message: `Reservation time must be between ${massageShop.openTime} and ${massageShop.closeTime}`
            });
        }



        //Check if time aligns with slot duration
        const minutesFromOpen = 60 * (reservationDate.getUTCHours() - openHour) + (reservationDate.getUTCMinutes() - openMinute);
        if (minutesFromOpen % slotDuration !== 0) {
            return res.status(400).json({
                success: false,
                message: `Reservation time must align with shop's ${slotDuration}-minute timeslots starting from ${massageShop.openTime}`
            });
        }

        //add user Id to req.body
        req.body.user = req.user.id

        //check for existed active reservations
        const existedReservations = await Reservation.find({
            user: req.user.id,
          status: { $in: [ 'confirmed', 'waitlisted' ] },
        });

        //If the user is not an admin, they can only create 3 active reservations.
        if (existedReservations.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: `The user with ID ${req.user.id} has already made 3 active reservations`
            });
        }

        //Check timeslot availability for the specific timeslot
        const startOfSlot = new Date(reservationDate);
        // const endOfSlot = new Date(reservationDate);
        // endOfSlot.setMinues(startOfSlot.getMinutes() + slotDuration);
        // endOfSlot.setMinutes(resMinute + slotDuration - 1, 59, 999);

        const reservationCount = await Reservation.countDocuments({
            massageShop: req.params.massageShopId,
            reservationDate: startOfSlot,
            status: {$in: ['confirmed','waitlisted']}
        });

        //Check if timeslot is full
        if (reservationCount >= massageShop.timeslotCapacity) {
            //Add to waitlist - calculate position

            req.body.waitlistPosition = reservationCount - massageShop.timeslotCapacity + 1;
            req.body.status = 'waitlisted';
            const reservation = await Reservation.create(req.body);

            return res.status(201).json({
                success: true,
                message: `Timeslot is full. You have been added to the waitlist at position ${reservation.waitlistPosition}.`,
                data: reservation
            });
        }

        //Timeslot available - create regular reservation
        // req.body.isWaitlist = false;
        const reservation = await Reservation.create(req.body);

        res.status(201).json({
            success: true,
            data: reservation
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Cannot create Reservation",
            error: error.message
        });
    }
};

//@desc Update reservation
//@route PUT /api/v1/reservations/:id
//@access Private
exports.updateReservation = async (req, res, next) => {
    try {
        let reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: `No reservation with the id of ${req.params.id}`
            });
        }

        //make sure user is the reservation owner or admin
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to update this reservation`
            });
        }

        reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
            new:true,
            runValidators:true
        });

        res.status(200).json({
            success: true,
            data: reservation
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Cannot update Reservation"
        });
    }
};

//@desc Delete reservation
//@route DELETE /api/v1/reservations/:id
//@access Private
exports.deleteReservation = async(req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if(!reservation) {
            return res.status(404).json({
                success: false,
                message: `No reservation with the id of ${req.params.id}`
            });
        }

        //make sure user is the reservation owner or admin
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to delete this reservation`
            });
        }

        // Store reservation details before deletion
        const massageShopId = reservation.massageShop;
        const reservationDate = reservation.reservationDate;
        const wasConfirmed = reservation.status === 'confirmed';
        const wasWaitlisted = reservation.status === 'waitlisted';

        await reservation.deleteOne();

        // If it was a confirmed reservation, promote waitlist
        if (wasConfirmed) {
            await promoteWaitlist(massageShopId, reservationDate, 0);
        } else if (wasWaitlisted) {
            await promoteWaitlist(massageShopId, reservationDate, reservation.waitlistPosition);
        }

        res.status(200).json({
            success:true,
            data: {},
            message: wasConfirmed ? 'Reservation deleted and waitlist updated' : 'Reservation deleted'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Cannot delete Reservation"
        });
    }
};

//@desc Cancel reservation
//@route PUT /api/v1/reservations/:id/cancel
//@access Private
exports.cancelReservation = async(req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if(!reservation) {
            return res.status(404).json({
                success: false,
                message: `No reservation with the id of ${req.params.id}`
            });
        }

        //make sure user is the reservation owner or admin
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to cancel this reservation`
            });
        }

        // Store reservation details before cancellation
        const massageShopId = reservation.massageShop;
        const reservationDate = reservation.reservationDate;
        const wasConfirmed = reservation.status === 'confirmed';
        const wasWaitlisted = reservation.status === 'waitlisted';

        const data = await reservation.updateOne({ status: 'cancelled' });

        // If it was a confirmed reservation, promote waitlist
        if (wasConfirmed) {
            await promoteWaitlist(massageShopId, reservationDate, 0);
        } else if (wasWaitlisted) {
            await promoteWaitlist(massageShopId, reservationDate, reservation.waitlistPosition);
        }

        res.status(200).json({
            success:true,
            data,
            message: 'Reservation cancelled'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Cannot cancel Reservation"
        });
    }
};
