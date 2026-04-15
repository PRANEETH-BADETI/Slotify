const express = require("express");
const {
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
} = require("../controllers/adminController");
const { validateBody, validateQuery } = require("../middlewares/validate");
const {
  eventTypeBulkSchema,
  eventTypeSchema,
} = require("../validators/eventTypeValidators");
const { availabilitySchema } = require("../validators/availabilityValidators");
const { meetingQuerySchema } = require("../validators/queryValidators");

const router = express.Router();

router.get("/profile", getProfile);
router.get("/event-types", getEventTypes);
router.post(
  "/event-types/bulk",
  validateBody(eventTypeBulkSchema),
  postEventTypeBulkAction
);
router.post("/event-types", validateBody(eventTypeSchema), postEventType);
router.patch(
  "/event-types/:eventTypeId",
  validateBody(eventTypeSchema),
  patchEventType
);
router.delete("/event-types/:eventTypeId", removeEventType);
router.get("/availability", getAvailability);
router.put("/availability", validateBody(availabilitySchema), putAvailability);
router.get("/meetings", validateQuery(meetingQuerySchema), getMeetings);
router.patch("/meetings/:meetingId/cancel", patchMeetingCancellation);

module.exports = router;
