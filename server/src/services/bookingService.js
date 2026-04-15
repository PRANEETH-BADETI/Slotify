const { addDays, addHours, addMinutes } = require("date-fns");
const { formatInTimeZone, toZonedTime } = require("date-fns-tz");
const { pool, query } = require("../config/db");
const { ApiError } = require("../utils/apiError");
const { getDbFeatures } = require("../utils/dbFeatures");
const { getBlockedHolidayDateKeys } = require("../utils/holidayCatalog");
const { getPublicEvent } = require("./eventTypeService");
const { sendBookingConfirmationEmail } = require("../utils/email");

const {
  createUtcDateFromLocal,
  getDateKeyInTimezone,
  overlaps,
} = require("../utils/time");

function parseRequestedStartTime(value) {
  const startTime = new Date(value);

  if (Number.isNaN(startTime.getTime())) {
    throw new ApiError(400, "Invalid meeting start time.");
  }

  return startTime;
}

async function validateRequestedSlot({ username, event, startTime, endTime, features }) {
  const now = new Date();

  if (startTime <= now) {
    throw new ApiError(400, "Please choose a future time slot.");
  }

  if (startTime > addDays(now, event.booking_window_days || 60)) {
    throw new ApiError(400, "That time slot is outside the allowed booking window.");
  }

  if (startTime < addHours(now, event.minimum_notice_hours || 0)) {
    throw new ApiError(400, "That time slot does not meet the minimum notice requirement.");
  }

  const localDateKey = formatInTimeZone(
    startTime,
    event.schedule_timezone,
    "yyyy-MM-dd"
  );
  const hostWeekday = toZonedTime(startTime, event.schedule_timezone).getDay();
  const rulesResult = await query(
    `
      SELECT day_of_week, start_time::text, end_time::text
      FROM availability_rules
      WHERE schedule_id = (
        SELECT id
        FROM availability_schedules
        WHERE user_id = (
          SELECT id FROM users WHERE username = $1
        )
          AND is_default = true
        LIMIT 1
      )
        AND day_of_week = $2
    `,
    [username, hostWeekday]
  );

  const rule = rulesResult.rows[0];
  const holidaysResult = features.scheduleHolidaysTable
    ? await query(
        `
          SELECT holiday_key
          FROM schedule_holidays
          WHERE schedule_id = $1
        `,
        [event.schedule_id]
      )
    : { rows: [] };
  const blockedDateKeys = getBlockedHolidayDateKeys(
    event.holiday_region || "NONE",
    holidaysResult.rows.map((holiday) => holiday.holiday_key)
  );

  if (!rule || blockedDateKeys.has(localDateKey)) {
    throw new ApiError(400, "That date is outside the host's availability.");
  }

  const allowedStart = createUtcDateFromLocal(
    localDateKey,
    rule.start_time.slice(0, 5),
    event.schedule_timezone
  );
  const allowedEnd = createUtcDateFromLocal(
    localDateKey,
    rule.end_time.slice(0, 5),
    event.schedule_timezone
  );

  if (startTime < allowedStart || endTime > allowedEnd) {
    throw new ApiError(400, "That time slot is no longer available.");
  }

  return { localDateKey };
}

async function loadScheduledBookings({
  client,
  username,
  features,
  startTime,
  endTime,
  ignoreBookingId = null,
}) {
  const params = [username, startTime.toISOString(), endTime.toISOString()];
  let ignoreClause = "";

  if (ignoreBookingId) {
    params.push(ignoreBookingId);
    ignoreClause = `AND bookings.id <> $${params.length}`;
  }

  const result = await client.query(
    `
      SELECT
        bookings.id,
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
        ${ignoreClause}
        AND bookings.start_time >= ($2::timestamptz - INTERVAL '1 day')
        AND bookings.start_time < ($3::timestamptz + INTERVAL '1 day')
    `,
    params
  );

  return result.rows;
}

function assertSlotConflicts({
  bookings,
  event,
  startTime,
  endTime,
  localDateKey,
}) {
  const hasConflict = bookings.some((booking) =>
    overlaps(
      addMinutes(startTime, -(event.buffer_before_minutes || 0)),
      addMinutes(endTime, event.buffer_after_minutes || 0),
      addMinutes(new Date(booking.start_time), -(booking.buffer_before_minutes || 0)),
      addMinutes(new Date(booking.end_time), booking.buffer_after_minutes || 0)
    )
  );

  if (hasConflict) {
    throw new ApiError(409, "This time slot was just booked. Please choose another.");
  }

  if (event.max_meetings_per_day) {
    const dailyBookingCount = bookings.filter(
      (booking) =>
        getDateKeyInTimezone(new Date(booking.start_time), event.schedule_timezone) ===
        localDateKey
    ).length;

    if (dailyBookingCount >= event.max_meetings_per_day) {
      throw new ApiError(409, "The daily meeting limit has been reached for that date.");
    }
  }
}

async function createBooking({ username, slug, payload }) {
  const event = await getPublicEvent(username, slug);
  const features = await getDbFeatures();
  const startTime = parseRequestedStartTime(payload.startTime);
  const endTime = addMinutes(startTime, event.duration_minutes);
  const { localDateKey } = await validateRequestedSlot({
    username,
    event,
    startTime,
    endTime,
    features,
  });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the host row so overlapping booking attempts are serialized.
    await client.query("SELECT id FROM users WHERE username = $1 FOR UPDATE", [
      username,
    ]);

    const existingBookings = await loadScheduledBookings({
      client,
      username,
      features,
      startTime,
      endTime,
    });

    assertSlotConflicts({
      bookings: existingBookings,
      event,
      startTime,
      endTime,
      localDateKey,
    });

    const bookingResult = features.bookingCustomQuestionAnswer
      ? await client.query(
          `
            INSERT INTO bookings (
              event_type_id,
              user_id,
              invitee_name,
              invitee_email,
              invitee_notes,
              custom_question_answer,
              invitee_timezone,
              start_time,
              end_time
            )
            VALUES (
              $1,
              (SELECT id FROM users WHERE username = $2),
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9
            )
            RETURNING id
          `,
          [
            event.id,
            username,
            payload.inviteeName,
            payload.inviteeEmail,
            payload.inviteeNotes || "",
            payload.customQuestionAnswer || "",
            payload.inviteeTimezone,
            startTime.toISOString(),
            endTime.toISOString(),
          ]
        )
      : await client.query(
          `
            INSERT INTO bookings (
              event_type_id,
              user_id,
              invitee_name,
              invitee_email,
              invitee_notes,
              invitee_timezone,
              start_time,
              end_time
            )
            VALUES (
              $1,
              (SELECT id FROM users WHERE username = $2),
              $3,
              $4,
              $5,
              $6,
              $7,
              $8
            )
            RETURNING id
          `,
          [
            event.id,
            username,
            payload.inviteeName,
            payload.inviteeEmail,
            payload.inviteeNotes || "",
            payload.inviteeTimezone,
            startTime.toISOString(),
            endTime.toISOString(),
          ]
        );

    await client.query("COMMIT");

    const bookingDetails = await getBookingDetails(bookingResult.rows[0].id);
    
    // Trigger email asynchronously 
    sendBookingConfirmationEmail(bookingDetails, false);
    
    return bookingDetails;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function rescheduleBooking({ bookingId, payload }) {
  const features = await getDbFeatures();
  const bookingResult = await query(
    `
      SELECT
        bookings.id,
        bookings.status,
        users.username,
        event_types.slug
      FROM bookings
      INNER JOIN users ON users.id = bookings.user_id
      INNER JOIN event_types ON event_types.id = bookings.event_type_id
      WHERE bookings.id = $1
      LIMIT 1
    `,
    [bookingId]
  );

  const existingBooking = bookingResult.rows[0];

  if (!existingBooking || existingBooking.status !== "scheduled") {
    throw new ApiError(404, "Booking not found.");
  }

  const event = await getPublicEvent(existingBooking.username, existingBooking.slug);
  const startTime = parseRequestedStartTime(payload.startTime);
  const endTime = addMinutes(startTime, event.duration_minutes);
  const { localDateKey } = await validateRequestedSlot({
    username: existingBooking.username,
    event,
    startTime,
    endTime,
    features,
  });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM users WHERE username = $1 FOR UPDATE", [
      existingBooking.username,
    ]);

    const existingBookings = await loadScheduledBookings({
      client,
      username: existingBooking.username,
      features,
      startTime,
      endTime,
      ignoreBookingId: bookingId,
    });

    assertSlotConflicts({
      bookings: existingBookings,
      event,
      startTime,
      endTime,
      localDateKey,
    });

    const updatedBooking = features.bookingCustomQuestionAnswer
      ? await client.query(
          `
            UPDATE bookings
            SET
              invitee_name = $1,
              invitee_email = $2,
              invitee_notes = $3,
              custom_question_answer = $4,
              invitee_timezone = $5,
              start_time = $6,
              end_time = $7,
              updated_at = NOW()
            WHERE id = $8
            RETURNING id
          `,
          [
            payload.inviteeName,
            payload.inviteeEmail,
            payload.inviteeNotes || "",
            payload.customQuestionAnswer || "",
            payload.inviteeTimezone,
            startTime.toISOString(),
            endTime.toISOString(),
            bookingId,
          ]
        )
      : await client.query(
          `
            UPDATE bookings
            SET
              invitee_name = $1,
              invitee_email = $2,
              invitee_notes = $3,
              invitee_timezone = $4,
              start_time = $5,
              end_time = $6,
              updated_at = NOW()
            WHERE id = $7
            RETURNING id
          `,
          [
            payload.inviteeName,
            payload.inviteeEmail,
            payload.inviteeNotes || "",
            payload.inviteeTimezone,
            startTime.toISOString(),
            endTime.toISOString(),
            bookingId,
          ]
        );

    await client.query("COMMIT");

    const bookingDetails = await getBookingDetails(updatedBooking.rows[0].id);
    
    // Trigger email asynchronously 
    sendBookingConfirmationEmail(bookingDetails, true);
    
    return bookingDetails;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getBookingDetails(bookingId) {
  const features = await getDbFeatures();
  const result = await query(
    `
      SELECT
        bookings.id,
        bookings.invitee_name,
        bookings.invitee_email,
        bookings.invitee_notes,
        ${
          features.bookingCustomQuestionAnswer
            ? "bookings.custom_question_answer"
            : "'' AS custom_question_answer"
        },
        bookings.invitee_timezone,
        bookings.start_time,
        bookings.end_time,
        bookings.status,
        bookings.created_at,
        event_types.name AS event_name,
        event_types.description AS event_description,
        event_types.duration_minutes,
        event_types.slug,
        ${
          features.eventTypeLocationType
            ? "event_types.location_type"
            : "'Google Meet' AS location_type"
        },
        ${
          features.eventTypeCustomQuestion
            ? "event_types.custom_question"
            : "'' AS custom_question"
        },
        users.full_name,
        users.username,
        availability_schedules.timezone AS schedule_timezone
      FROM bookings
      INNER JOIN event_types ON event_types.id = bookings.event_type_id
      INNER JOIN users ON users.id = bookings.user_id
      LEFT JOIN availability_schedules
        ON availability_schedules.user_id = users.id
        AND availability_schedules.is_default = true
      WHERE bookings.id = $1
      LIMIT 1
    `,
    [bookingId]
  );

  if (!result.rows[0]) {
    throw new ApiError(404, "Booking not found.");
  }

  return result.rows[0];
}

module.exports = {
  createBooking,
  getBookingDetails,
  rescheduleBooking,
};
