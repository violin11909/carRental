const mongoose = require("mongoose");
const CarSchema = new mongoose.Schema(
  {
    model: {
      type: String,
      required: [true, "Please add model name"],
      unique: true,
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add description"],
    },
    picture: {
      type: String,
      required: false,
    },
    seats: {
      type: Number,
      required: [true, "Please add number of seats"],
    },
    doors: {
      type: Number,
      required: [true, "Please add number of doors"],
    },
    largebags: {
      type: Number,
      required: [true, "Please add number of large bags that can be accommodated"],
    },
    smallbags: {
      type: Number,
      required: [true, "Please add number of small bags that can be accommodated"],
    },
    automatic: {
      type: Boolean,
      required: [true, "Please identify it uses automatic transmission"],
    },
    dayRate: {
      type: Number,
      required: [true, "Please add day rate"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
// Cascade delete bookings when a car is deleted
CarSchema.pre("remove", async function (next) {
  console.log(`Booking being removed from car ${this._id}`);
  await this.model("Booking").deleteMany({ car: this._id });
  next();
});
// Reverse populate with virtuals
CarSchema.virtual("bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "car",
  justOne: false,
});
module.exports = mongoose.model("Car", CarSchema);
