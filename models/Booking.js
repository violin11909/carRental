const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  pickupDate: {
    type: Date,
    required: true,
  },
  pickupLocation: {
    type: String,
    required: [true, "Please add pick-up location"],
  },
  returnDate: {
    type: Date,
    required: true,
  },
  returnLocation: {
    type: String,
    required: [true, "Please add return location"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  car: {
    type: mongoose.Schema.ObjectId,
    ref: "Car",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", BookingSchema);
