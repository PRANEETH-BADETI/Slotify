const { z } = require("zod");

const meetingQuerySchema = z.object({
  status: z.enum(["upcoming", "past"]).default("upcoming"),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  eventTypeIds: z.string().optional(),
  inviteeEmails: z.string().optional(),
});

const availabilityQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM month format."),
  timezone: z.string().optional(),
  rescheduleBookingId: z.string().uuid().optional(),
});

module.exports = {
  availabilityQuerySchema,
  meetingQuerySchema,
};
