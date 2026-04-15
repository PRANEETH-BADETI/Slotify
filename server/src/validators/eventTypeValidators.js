const { z } = require("zod");

const eventTypeSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long."),
  description: z
    .string()
    .max(240, "Description must be 240 characters or fewer.")
    .optional()
    .or(z.literal("")),
  durationMinutes: z
    .number({
      invalid_type_error: "Duration is required.",
    })
    .int("Duration must be a whole number.")
    .min(15, "Duration must be at least 15 minutes.")
    .max(240, "Duration must be 240 minutes or fewer."),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only."
    )
    .min(3, "Slug must be at least 3 characters long.")
    .max(80, "Slug must be 80 characters or fewer."),
  isActive: z.boolean().optional().default(true),
  locationType: z.string().min(1).max(50).optional().default("Google Meet"),
  bookingWindowDays: z.coerce
    .number()
    .int("Booking window must be a whole number.")
    .min(1, "Booking window must be at least 1 day.")
    .max(365, "Booking window must be 365 days or fewer.")
    .optional()
    .default(60),
  minimumNoticeHours: z.coerce
    .number()
    .int("Minimum notice must be a whole number.")
    .min(0, "Minimum notice cannot be negative.")
    .max(168, "Minimum notice must be 168 hours or fewer.")
    .optional()
    .default(4),
  bufferBeforeMinutes: z.coerce
    .number()
    .int("Buffer must be a whole number.")
    .min(0, "Buffer cannot be negative.")
    .max(240, "Buffer must be 240 minutes or fewer.")
    .optional()
    .default(0),
  bufferAfterMinutes: z.coerce
    .number()
    .int("Buffer must be a whole number.")
    .min(0, "Buffer cannot be negative.")
    .max(240, "Buffer must be 240 minutes or fewer.")
    .optional()
    .default(0),
  customQuestion: z
    .string()
    .max(240, "Custom question must be 240 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

const eventTypeBulkSchema = z.object({
  ids: z.array(z.string().uuid("Invalid event type selection.")).min(1, "Select at least one event type."),
  action: z.enum(["delete", "toggle"]),
  isActive: z.boolean().optional(),
});

module.exports = { eventTypeBulkSchema, eventTypeSchema };
