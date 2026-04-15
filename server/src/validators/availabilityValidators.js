const { z } = require("zod");

const timeValue = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM time format.");

const daySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    enabled: z.boolean(),
    startTime: timeValue,
    endTime: timeValue,
  })
  .refine(
    (value) => {
      if (!value.enabled) {
        return true;
      }

      return value.startTime < value.endTime;
    },
    {
      message: "End time must be after start time.",
      path: ["endTime"],
    }
  );

const availabilitySchema = z.object({
  timezone: z.string().min(1, "Timezone is required."),
  days: z.array(daySchema).length(7, "All seven weekday rows are required."),
  maxMeetingsPerDay: z.coerce
    .number()
    .int("Meeting limit must be a whole number.")
    .min(0, "Meeting limit cannot be negative.")
    .max(100, "Meeting limit is too large.")
    .nullable()
    .optional()
    .transform((value) => (value === 0 ? null : value ?? null)),
  holidayRegion: z
    .enum(["NONE", "US"])
    .optional()
    .default("NONE"),
  enabledHolidayKeys: z.array(z.string()).optional().default([]),
});

module.exports = { availabilitySchema };
