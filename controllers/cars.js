const Car = require("../models/Car");

//@desc     Get all cars
//@route    GET /api/v1/cars
//@access   Public
exports.getCars = async (req, res, next) => {
  const reqQuery = { ...req.query };
  const removeFields = ["select", "sort", "page", "limit"];
  removeFields.forEach((param) => delete reqQuery[param]);
  let queryStr = JSON.stringify(reqQuery).replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );
  // Finding resource
  let query = Car.find(JSON.parse(queryStr));
  // Select
  if (req.query.select) {
    query = query.select(req.query.select.split(",").join(" "));
  }
  // Sort
  query = req.query.sort
    ? query.sort(req.query.sort.split(",").join(" "))
    : query.sort("-createdAt");
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIdx = (page - 1) * limit;
  const endIdx = page * limit;
  const total = await Car.countDocuments();
  query = query.skip(startIdx).limit(limit);
  try {
    // Executing query
    const cars = await query;
    // Pagination result
    const pagination = {};
    if (endIdx < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIdx > 0) {
      pagination.prev = { page: page - 1, limit };
    }
    res.status(200).json({
      success: true,
      count: cars.length,
      pagination,
      data: cars,
    });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

//@desc     Get single car
//@route    GET /api/v1/cars/:id
//@access   Public
exports.getCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(400).json({ success: false });
    }
    res.status(200).json({ success: true, data: car });
  } catch (error) {
    res.status(400).json({ success: false });
  }
};

//@desc     Create single car
//@route    POST /api/v1/cars
//@access   Private
exports.createCar = async (req, res, next) => {
  console.log(req.body);
  try {
    const car = await Car.create(req.body);
    res.status(201).json({ success: true, data: car });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

//@desc     Update single car
//@route    PUT /api/v1/cars/:id
//@access   Private
exports.updateCar = async (req, res, next) => {
  try {
    const car = await Car.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!car) {
      res.status(400).json({ success: false });
    }
    res.status(200).json({ success: true, data: car });
  } catch (error) {
    res.status(400).json({ success: false });
  }
};

//@desc     Delete single car
//@route    DELETE /api/v1/cars/:id
//@access   Private
exports.deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(400).json({ success: false });
    }
    car.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false });
  }
};
