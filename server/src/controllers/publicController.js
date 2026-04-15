const { catchAsync } = require("../utils/catchAsync");
const { getPublicAvailability } = require("../services/availabilityService");
const {
  getBookingDetails,
  createBooking,
  rescheduleBooking,
} = require("../services/bookingService");
const { getPublicEvent } = require("../services/eventTypeService");

const getEventDetails = catchAsync(async (req, res) => {
  const data = await getPublicEvent(req.params.username, req.params.slug);
  res.json(data);
});

const getEventAvailability = catchAsync(async (req, res) => {
  const data = await getPublicAvailability({
    username: req.params.username,
    slug: req.params.slug,
    month: req.validatedQuery.month,
    timezone: req.validatedQuery.timezone,
    rescheduleBookingId: req.validatedQuery.rescheduleBookingId,
  });
  res.json(data);
});

const postBooking = catchAsync(async (req, res) => {
  const data = await createBooking({
    username: req.params.username,
    slug: req.params.slug,
    payload: req.validatedBody,
  });
  res.status(201).json(data);
});

const patchBookingReschedule = catchAsync(async (req, res) => {
  const data = await rescheduleBooking({
    bookingId: req.params.bookingId,
    payload: req.validatedBody,
  });
  res.json(data);
});

const getBookingConfirmation = catchAsync(async (req, res) => {
  const data = await getBookingDetails(req.params.bookingId);
  res.json(data);
});

module.exports = {
  getBookingConfirmation,
  getEventAvailability,
  getEventDetails,
  patchBookingReschedule,
  postBooking,
};
