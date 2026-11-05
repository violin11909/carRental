/**
* @swagger
* components:
*   schemas:
*     Car:
*       type: object
*       required:
*         - model
*         - description
*         - seats
*         - doors
*         - largebags
*         - smallbags
*         - automatic
*         - dayRate
*       properties:
*         model:
*           type: string
*           description: Name of the car model
*         description:
*           type: string
*           description: Description of the car 
*         picture:
*           type: string
*           description: Picture of the car
*         seats:
*           type: integer
*           description: Number of seats (Passenger Capacity)
*         doors:
*           type: integer
*           description: Number of doors 
*         largebags:
*           type: integer
*           description: Number of large bags that can be accommodated
*         smallbags:
*           type: integer
*           description: Number of small bags that can be accommodated
*         automatic:
*           type: boolean
*           description: Identify the car uses automatic transmission or not 
*         dayRate:
*           type: number
*           description: Daily rental rate including insurance
*/

const express = require("express");
const {
  getCars,
  getCar,
  createCar,
  updateCar,
  deleteCar,
} = require("../controllers/cars");

/**
* @swagger
* tags:
*   name: Cars
*   description: The cars managing API
*/

// Include other resource routers
const bookingRouter = require("./bookings");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");

// Re-route into other resource routers

/**
* @swagger
* /cars:
*   post:
*     security:
*       - bearerAuth: []
*     summary: Create a new car
*     tags: [Cars]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             $ref: '#/components/schemas/Car'
*     responses:
*       201:
*         description: The car was successfully created
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Car'
*       500:
*         description: Some server error
*/

/**
* @swagger
* /cars:
*   get:
*     summary: Returns the list of all the cars
*     tags: [Cars]
*     responses:
*       200:
*         description: The list of the cars
*         content:
*           application/json:
*             schema:
*               type: array
*               items:
*               $ref: '#/components/schemas/Car'
*/
router.use("/:carId/bookings", bookingRouter);
router.route("/").get(getCars).post(protect, authorize("admin"), createCar);

/**
* @swagger
* /cars/{id}:
*   get:
*     summary: Get the car by id
*     tags: [Cars]
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*         required: true
*         description: The car id
*     responses:
*       200:
*         description: The car description by id
*         contents:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Car'
*       404:
*         description: The car was not found
*/
router
  .route("/:id")
  .get(getCar)
  .put(protect, authorize("admin"), updateCar)
  .delete(protect, authorize("admin"), deleteCar);

module.exports = router;
