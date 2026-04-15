const { pool, query } = require("../config/db");
const { buildMonthlyAvailability } = require("../utils/time");
const { ApiError } = require("../utils/apiError");
const { getDbFeatures } = require("../utils/dbFeatures");
const {
  getBlockedHolidayDateKeys,
  getHolidayOptions,
} = require("../utils/holidayCatalog");
const { getPublicEvent } = require("./eventTypeService");
const { getDefaultUser } = require("./userService");

const DAY_TEMPLATE = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  enabled: false,
  startTime: "09:00",
  endTime: "17:00",
}));

async function getAvailabilitySettings() {
  const user = await getDefaultUser();
  const features = await getDbFeatures();
  const scheduleResult = await query(
    `
      SELECT *
      FROM availability_schedules
      WHERE user_id = $1 AND is_default = true
      LIMIT 1
    `,
    [user.id]
  );

  const schedule = scheduleResult.rows[0];

  if (!schedule) {
    return {
      timezone: user.timezone,
      days: DAY_TEMPLATE,
      maxMeetingsPerDay: null,
      holidayRegion: "NONE",
      enabledHolidayKeys: [],
      holidayOptions: getHolidayOptions("US"),
    };
  }

  const [rulesResult, holidaysResult] = await Promise.all([
    query(
      `
        SELECT day_of_week, start_time::text, end_time::text
        FROM availability_rules
        WHERE schedule_id = $1
        ORDER BY day_of_week ASC, start_time ASC
      `,
      [schedule.id]
    ),
    features.scheduleHolidaysTable
      ? query(
          `
            SELECT holiday_key
            FROM schedule_holidays
            WHERE schedule_id = $1
            ORDER BY holiday_key ASC
          `,
          [schedule.id]
        )
      : Promise.resolve({ rows: [] }),
  ]);

  const rules = rulesResult.rows;
  const enabledHolidayKeys = holidaysResult.rows.map((holiday) => holiday.holiday_key);
  const holidayRegion =
    features.availabilityHolidayRegion && schedule.holiday_region
      ? schedule.holiday_region
      : "NONE";
  const holidayCatalogRegion = holidayRegion === "NONE" ? "US" : holidayRegion;

  return {
    timezone: schedule.timezone,
    days: DAY_TEMPLATE.map((day) => {
      const rule = rules.find((item) => item.day_of_week === day.dayOfWeek);

      if (!rule) {
        return day;
      }

      return {
        dayOfWeek: day.dayOfWeek,
        enabled: true,
        startTime: rule.start_time.slice(0, 5),
        endTime: rule.end_time.slice(0, 5),
      };
    }),
    maxMeetingsPerDay: features.availabilityMaxMeetingsPerDay
      ? schedule.max_meetings_per_day
      : null,
    holidayRegion,
    enabledHolidayKeys,
    holidayOptions: getHolidayOptions(holidayCatalogRegion),
  };
}

async function updateAvailabilitySettings(payload) {
  const user = await getDefaultUser();
  const features = await getDbFeatures();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let scheduleResult = await client.query(
      `
        SELECT *
        FROM availability_schedules
        WHERE user_id = $1 AND is_default = true
        LIMIT 1
      `,
      [user.id]
    );

    let schedule = scheduleResult.rows[0];

    if (!schedule) {
      scheduleResult = features.availabilityMaxMeetingsPerDay && features.availabilityHolidayRegion
        ? await client.query(
            `
              INSERT INTO availability_schedules (
                user_id,
                name,
                timezone,
                is_default,
                max_meetings_per_day,
                holiday_region
              )
              VALUES ($1, $2, $3, true, $4, $5)
              RETURNING *
            `,
            [
              user.id,
              "Working hours",
              payload.timezone,
              payload.maxMeetingsPerDay,
              payload.holidayRegion,
            ]
          )
        : await client.query(
            `
              INSERT INTO availability_schedules (user_id, name, timezone, is_default)
              VALUES ($1, $2, $3, true)
              RETURNING *
            `,
            [user.id, "Working hours", payload.timezone]
          );
      schedule = scheduleResult.rows[0];
    } else {
      scheduleResult = features.availabilityMaxMeetingsPerDay && features.availabilityHolidayRegion
        ? await client.query(
            `
              UPDATE availability_schedules
              SET
                timezone = $1,
                max_meetings_per_day = $2,
                holiday_region = $3,
                updated_at = NOW()
              WHERE id = $4
              RETURNING *
            `,
            [
              payload.timezone,
              payload.maxMeetingsPerDay,
              payload.holidayRegion,
              schedule.id,
            ]
          )
        : await client.query(
            `
              UPDATE availability_schedules
              SET timezone = $1, updated_at = NOW()
              WHERE id = $2
              RETURNING *
            `,
            [payload.timezone, schedule.id]
          );
      schedule = scheduleResult.rows[0];
    }

    await client.query("DELETE FROM availability_rules WHERE schedule_id = $1", [
      schedule.id,
    ]);

    const enabledDays = payload.days.filter((day) => day.enabled);

    for (const day of enabledDays) {
      await client.query(
        `
          INSERT INTO availability_rules (
            schedule_id,
            day_of_week,
            start_time,
            end_time
          )
          VALUES ($1, $2, $3, $4)
        `,
        [schedule.id, day.dayOfWeek, day.startTime, day.endTime]
      );
    }

    if (features.scheduleHolidaysTable) {
      await client.query("DELETE FROM schedule_holidays WHERE schedule_id = $1", [
        schedule.id,
      ]);

      for (const holidayKey of payload.enabledHolidayKeys || []) {
        await client.query(
          `
            INSERT INTO schedule_holidays (schedule_id, holiday_key)
            VALUES ($1, $2)
          `,
          [schedule.id, holidayKey]
        );
      }
    }

    await client.query("COMMIT");

    return {
      timezone: schedule.timezone,
      days: payload.days,
      maxMeetingsPerDay: features.availabilityMaxMeetingsPerDay
        ? schedule.max_meetings_per_day
        : null,
      holidayRegion: features.availabilityHolidayRegion
        ? schedule.holiday_region || "NONE"
        : "NONE",
      enabledHolidayKeys: features.scheduleHolidaysTable
        ? [...(payload.enabledHolidayKeys || [])].sort()
        : [],
      holidayOptions: getHolidayOptions("US"),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getPublicAvailability({
  username,
  slug,
  month,
  timezone,
  rescheduleBookingId,
}) {
  const event = await getPublicEvent(username, slug);
  const features = await getDbFeatures();

  if (!event.schedule_timezone) {
    throw new ApiError(400, "The host has not configured availability yet.");
  }

  const [scheduleResult, bookingsResult, holidaysResult] = await Promise.all([
    query(
      `
        SELECT availability_rules.day_of_week, availability_rules.start_time::text, availability_rules.end_time::text
        FROM availability_schedules
        INNER JOIN availability_rules
          ON availability_rules.schedule_id = availability_schedules.id
        INNER JOIN users
          ON users.id = availability_schedules.user_id
        WHERE users.username = $1
          AND availability_schedules.is_default = true
      `,
      [username]
    ),
    query(
      `
        SELECT
          bookings.start_time,
          bookings.end_time,
          ${
            features.eventTypeBufferBeforeMinutes
              ? "event_types.buffer_before_minutes"
              : "0 AS buffer_before_minutes"
          },
          ${
            features.eventTypeBufferAfterMinutes
              ? "event_types.buffer_after_minutes"
              : "0 AS buffer_after_minutes"
          }
        FROM bookings
        INNER JOIN event_types ON event_types.id = bookings.event_type_id
        WHERE bookings.user_id = (
          SELECT id FROM users WHERE username = $1
        )
          AND bookings.status = 'scheduled'
          AND ($3::uuid IS NULL OR bookings.id <> $3::uuid)
          AND bookings.start_time >= date_trunc('month', $2::date) - INTERVAL '1 day'
          AND bookings.start_time < (date_trunc('month', $2::date) + INTERVAL '1 month' + INTERVAL '1 day')
      `,
      [username, `${month}-01`, rescheduleBookingId || null]
    ),
    features.scheduleHolidaysTable
      ? query(
          `
            SELECT holiday_key
            FROM schedule_holidays
            WHERE schedule_id = $1
          `,
          [event.schedule_id]
        )
      : Promise.resolve({ rows: [] }),
  ]);

  const enabledHolidayKeys = holidaysResult.rows.map((holiday) => holiday.holiday_key);
  const blockedDateKeys = getBlockedHolidayDateKeys(
    event.holiday_region || "NONE",
    enabledHolidayKeys
  );

  const days = buildMonthlyAvailability({
    monthKey: month,
    rules: scheduleResult.rows,
    bookings: bookingsResult.rows,
    durationMinutes: event.duration_minutes,
    hostTimezone: event.schedule_timezone,
    viewerTimezone: timezone || event.schedule_timezone,
    blockedDateKeys,
    maxMeetingsPerDay: event.max_meetings_per_day,
    bookingWindowDays: event.booking_window_days,
    minimumNoticeHours: event.minimum_notice_hours,
    bufferBeforeMinutes: event.buffer_before_minutes,
    bufferAfterMinutes: event.buffer_after_minutes,
  });

  return {
    event,
    viewerTimezone: timezone || event.schedule_timezone,
    month,
    days,
  };
}

module.exports = {
  getAvailabilitySettings,
  getPublicAvailability,
  updateAvailabilitySettings,
};
