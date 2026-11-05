const Booking = require("../models/Booking");
const Car = require("../models/Car");
const User = require("../models/User");
const { validatePickupAndReturnDate } = require("../utils/date");
const { sendMail } = require("./mails");

//@desc     Get all bookings
//@route    GET /api/v1/bookings
//@access   Private
exports.getBookings = async (req, res, next) => {
  let query;
  let carId = req.params.carId;
  if (req.user.role !== "admin") {
    if (carId) {
      query = Booking.find({
        user: req.user.id,
        car: carId,
      }).populate({
        path: "car",
        select: "model description",
      });
    } else {
      query = Booking.find({
        user: req.user.id,
      }).populate({
        path: "car",
        select: "model description",
      });
    }
  } 
  else {
    if (carId) {
      query = Booking.find({ car: carId }).populate({
        path: "car",
        select: "model description",
      });
    } else {
      query = Booking.find().populate({
        path: "car",
        select: "model description",
      });
    }
  }
  try {
    const bookings = await query;
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Booking" });
  }
};

//@desc     Get single booking
//@route    GET /api/v1/booking/:id
//@access   Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: "car",
      select: "model description",
    });
    if (!booking) 
    {
      return res.status(404).json({
        success: false,
        message: `No booking with the id of ${req.params.id}`,
      });
    }
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Booking" });
  }
};

//@desc     Add booking
//@route    POST /api/v1/cars/:carId/bookings
//@access   Private
exports.addBooking = async (req, res, next) => {
  try {
    req.body.car = req.params.carId;
    const car = await Car.findById(req.params.carId);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: `No car with the id of ${req.params.carId}`,
      });
    }
    req.body.user = req.user.id;

    // only allow the registered user to book up to 3 nights
    const pickupDate = new Date(req.body.pickupDate);
    const returnDate = new Date(req.body.returnDate);
    const isValidDate = validatePickupAndReturnDate(
      pickupDate,
      returnDate
    );
    if (!isValidDate.pickupBeforeReturn) {
      return res.status(400).json({
        success: false,
        message: `The return date should be after the pickup date.`,
      });
    } else {
      const booking = await Booking.create(req.body);
      res.status(200).json({
        success: true,
        data: booking,
      });

      User.findById(req.user.id, function (err, user) {
        if (err) {
          console.log(err);
        } else {
          //sendMail(user, booking);
        }
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot create Booking",
    });
  }
};

//@desc     Update booking
//@route    PUT /api/v1/bookings/:id
//@access   Private
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with the id of ${req.params.id}`,
      });
    }
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this booking`,
      });
    }

    // check the booking period not exceed 3 nights
    if (req.body.pickupDate) 
    {
      const pickupDate = new Date(req.body.pickupDate);

      if (req.body.returnDate) 
      {
        const returnDate = new Date(req.body.returnDate);
        const isValidDate = validatePickupAndReturnDate(
          pickupDate,
          returnDate
        );
        if (!isValidDate.pickupBeforeReturn) 
        {
          return res.status(400).json({
            success: false,
            message: `The return date should be after the pickup date.`,
          });
        }
      } 
      else {
        const isValidDate = validatePickupAndReturnDate(
          pickupDate,
          booking.returnDate
        );
        if (!isValidDate.pickupBeforeReturn) 
        {
          return res.status(400).json({
            success: false,
            message: `Cannot change pickup date to be after return date.`,
          });
        }
      }
    } 
    else if (req.body.returnDate) 
    {
      const returnDate = new Date(req.body.returnDate);
      const isValidDate = validatePickupAndReturnDate(booking.pickupDate, returnDate);
      if (!isValidDate.pickupBeforeReturn) 
      {
        return res.status(400).json({
          success: false,
          message: `Cannot change return date to be before pickup date.`,
        });
      } 
    }
    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot update Booking",
    });
  }
};

//@desc     Delete booking
//@route    DELETE /api/v1/bookings/:id
//@access   Private
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with the id of ${req.params.id}`,
      });
    }
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this booking`,
      });
    }
    await booking.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Cannot delete Booking",
    });
  }
};
