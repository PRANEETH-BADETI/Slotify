const { catchAsync } = require("../utils/catchAsync");
const { getAdminProfile } = require("../services/userService");
const {
  bulkUpdateEventTypes,
  createEventType,
  deleteEventType,
  listEventTypes,
  updateEventType,
} = require("../services/eventTypeService");
const {
  getAvailabilitySettings,
  updateAvailabilitySettings,
} = require("../services/availabilityService");
const { cancelMeeting, listMeetings } = require("../services/meetingService");

const getProfile = catchAsync(async (_req, res) => {
  const data = await getAdminProfile();
  res.json(data);
});

const getEventTypes = catchAsync(async (_req, res) => {
  const data = await listEventTypes();
  res.json(data);
});

const postEventType = catchAsync(async (req, res) => {
  const data = await createEventType(req.validatedBody);
  res.status(201).json(data);
});

const patchEventType = catchAsync(async (req, res) => {
  const data = await updateEventType(req.params.eventTypeId, req.validatedBody);
  res.json(data);
});

const removeEventType = catchAsync(async (req, res) => {
  const data = await deleteEventType(req.params.eventTypeId);
  res.json(data);
});

const postEventTypeBulkAction = catchAsync(async (req, res) => {
  const data = await bulkUpdateEventTypes(req.validatedBody);
  res.json(data);
});

const getAvailability = catchAsync(async (_req, res) => {
  const data = await getAvailabilitySettings();
  res.json(data);
});

const putAvailability = catchAsync(async (req, res) => {
  const data = await updateAvailabilitySettings(req.validatedBody);
  res.json(data);
});

const getMeetings = catchAsync(async (req, res) => {
  const data = await listMeetings(req.validatedQuery);
  res.json(data);
});

const patchMeetingCancellation = catchAsync(async (req, res) => {
  const data = await cancelMeeting(req.params.meetingId);
  res.json(data);
});

module.exports = {
  getAvailability,
  getEventTypes,
  getMeetings,
  getProfile,
  patchEventType,
  patchMeetingCancellation,
  postEventTypeBulkAction,
  postEventType,
  putAvailability,
  removeEventType,
};
