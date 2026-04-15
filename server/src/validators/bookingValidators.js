const { z } = require("zod");

const createBookingSchema = z.object({
  inviteeName: z.string().min(2, "Name is required."),
  inviteeEmail: z.string().email("Enter a valid email address."),
  inviteeNotes: z
    .string()
    .max(500, "Notes must be 500 characters or fewer.")
    .optional(),
  customQuestionAnswer: z
    .string()
    .max(500, "Response must be 500 characters or fewer.")
    .optional()
    .or(z.literal("")),
  inviteeTimezone: z.string().min(1, "Timezone is required."),
  startTime: z.string().datetime("Invalid meeting time."),
});

const rescheduleBookingSchema = createBookingSchema.extend({});

module.exports = { createBookingSchema, rescheduleBookingSchema };
