const Reservation = require('../models/Reservation');
const MassageShop = require('../models/MassageShop');
const History = require('../models/History');


const promoteWaitlist = async (massageShopId, reservationDate, waitlistPosition) => {
    try {
        const massageShop = await MassageShop.findById(massageShopId);
        if (!massageShop) return;

        const startOfSlot = new Date(reservationDate);

        // const confirmedReservations = await Reservation.countDocuments({
        //     massageShop: massageShopId,
        //     reservationDate: startOfSlot,
        //     // status: 'confirmed',
        //     isWaitlist: false
        // });

        // console.log("yes)")
        const result = await Reservation.updateMany(
          {
            messageShop: massageShopId,
            // status: 'waitlisted',
            isWaitlist: true,
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
            // status: 'waitlisted',
            isWaitlist: true,
            waitlistPosition: 0,
            reservationDate: startOfSlot,
          },
          {
            $set: { isWaitlist: false },
            $unset: { waitlistPosition: "" }
            }
        )

    } catch (error) {
        console.error('Error promoting waitlist:', error);
    }
};

const validateTimeslot = async (reservationDate, massageShop,res) => {
  //Validate reservationDate includes time
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

  const openTime = new Date(reservationDate);
  const closeTime = new Date(reservationDate);
  openTime.setUTCHours(openHour);
  openTime.setUTCMinutes(openMinute);
  closeTime.setUTCHours(closeHour);
  closeTime.setUTCMinutes(closeMinute);

  //Check if time is within shop hours
  if (reservationDate < openTime || reservationDate >= closeTime) {
      res.status(400).json({
          success: false,
          message: `Reservation time must be between ${massageShop.openTime} and ${massageShop.closeTime}`
      });
      return false;
  }

  //Check if time aligns with slot duration
  const minutesFromOpen = 60 * (reservationDate.getUTCHours() - openHour) + (reservationDate.getUTCMinutes() - openMinute);
  if (minutesFromOpen % slotDuration !== 0) {
      res.status(400).json({
          success: false,
          message: `Reservation time must align with shop's ${slotDuration}-minute timeslots starting from ${massageShop.openTime}`
      });
      return false
  }

  return true;
};

const checkTimeslotAvailability = async (massageShopId, reservationDate, req) => {
  const startOfSlot = new Date(reservationDate);
  const massageShop = await MassageShop.findById(massageShopId);
  console.log(massageShop)

  const reservationCount = await Reservation.countDocuments({
    massageShop: massageShopId,
    reservationDate: startOfSlot,
  });

  if (reservationCount >= massageShop.timeslotCapacity) {
      //Add to waitlist - calculate position
      req.body.waitlistPosition = reservationCount - massageShop.timeslotCapacity + 1;
      req.body.isWaitlist = true;
      // req.body.status = 'waitlisted';
      return false;
  }
  return true;
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
        }).populate({
            path: 'massageShop',
            select: 'name address tel openTime closeTime waiatlistPosition'
        });
    } else { // If you are an admin you can see all active reservations
        if (req.params.massageShopId) {
            console.log(req.params.massageShopId);
            query = Reservation.find({
                massageShop: req.params.massageShopId,
            }).populate({
                path: 'massageShop',
                select: 'name address tel openTime closeTime waiatlistPosition'
            });
        } else {
            query = Reservation.find().populate({
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

        //add user Id to req.body
        req.body.user = req.user.id

        //check for existed active reservations
        const existedReservations = await Reservation.find({
            user: req.user.id,
        });

        //If the user is not an admin, they can only create 3 active reservations.
        if (existedReservations.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: `The user with ID ${req.user.id} has already made 3 active reservations`
            });
        }

        const reservationDate = new Date(req.body.reservationDate);
        const isValidTimeslot = await validateTimeslot(reservationDate, massageShop, res);
        if (!isValidTimeslot) return;


        //Check if timeslot is full
        const isAvailible = await checkTimeslotAvailability(req.params.massageShopId,reservationDate, req);
        if (!isAvailible) {
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

        //make more sensible
        if (req.user.role != 'admin') {
          // prevent changing user, messageShop, status, waitlistPosition, iswaitlist fields for general users
          if (req.body.user || req.body.massageShop || req.body.status || req.body.waitlistPosition || req.body.isWaitlist) {
              return res.status(400).json({
                  success: false,
                  message: 'You are not allowed to update user, massageShop, status, waitlistPosition, or isWaitlist fields'
              });
          }
        }

        const massageShop = await MassageShop.findById(reservation.massageShop);
        const wasConfirmed = reservation.isWaitlist === false;

        if (req.body.reservationDate) {
          const reservationDate = new Date(req.body.reservationDate);
          const isValidTimeslot = await validateTimeslot(reservationDate, massageShop, res);
           if (!isValidTimeslot) return;
           if (reservationDate.getTime()===reservation.reservationDate.getTime()) {
             return res.status(400).json({
                 success: false,
                 message: 'The new reservation date is the same as the current one'
             });
           };
        }


        if (req.body.reservationDate) {
          // check will be if waitlisted or confirmed after update
          await checkTimeslotAvailability(massageShop._id,req.body.reservationDate, req);

          // If it was a confirmed reservation, promote waitlist
          if (wasConfirmed) {
              await promoteWaitlist(massageShop._id, reservation.reservationDate, 0);
          } else {
              await promoteWaitlist(massageShop._id, reservation.reservationDate, reservation.waitlistPosition);
          }
        }

        reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
            new:true,
            runValidators:true
        });

        return res.status(200).json({
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
        const wasConfirmed = reservation.isWaitlist === false;

        await History.create({
            reservation: reservation._id,
            user: reservation.user,
            massageShop: reservation.massageShop,
            reservationDate: reservation.reservationDate,
            status: "cancelled",
        });
        await reservation.deleteOne();

        // If it was a confirmed reservation, promote waitlist
        if (wasConfirmed) {
            await promoteWaitlist(massageShopId, reservationDate, 0);
        } else {
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
