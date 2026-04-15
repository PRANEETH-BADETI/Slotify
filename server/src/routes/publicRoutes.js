const express = require("express");
const {
  getBookingConfirmation,
  getEventAvailability,
  getEventDetails,
  patchBookingReschedule,
  postBooking,
} = require("../controllers/publicController");
const { validateBody, validateQuery } = require("../middlewares/validate");
const {
  createBookingSchema,
  rescheduleBookingSchema,
} = require("../validators/bookingValidators");
const { availabilityQuerySchema } = require("../validators/queryValidators");

const router = express.Router();

router.get("/bookings/:bookingId", getBookingConfirmation);
router.patch(
  "/bookings/:bookingId/reschedule",
  validateBody(rescheduleBookingSchema),
  patchBookingReschedule
);
router.get("/:username/:slug", getEventDetails);
router.get(
  "/:username/:slug/availability",
  validateQuery(availabilityQuerySchema),
  getEventAvailability
);
router.post(
  "/:username/:slug/bookings",
  validateBody(createBookingSchema),
  postBooking
);

module.exports = router;
