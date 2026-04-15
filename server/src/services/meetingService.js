const { query } = require("../config/db");
const { ApiError } = require("../utils/apiError");
const { getDbFeatures } = require("../utils/dbFeatures");
const { getDefaultUser } = require("./userService");
const { getBookingDetails } = require("./bookingService");
const { sendCancellationEmail } = require("../utils/email");

function parseCsvList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function listMeetings(filters) {
  const user = await getDefaultUser();
  const features = await getDbFeatures();
  const comparator = filters.status === "past" ? "<" : ">=";
  const sort = filters.status === "past" ? "DESC" : "ASC";
  const eventTypeIds = parseCsvList(filters.eventTypeIds);
  const inviteeEmails = parseCsvList(filters.inviteeEmails);
  const params = [user.id];
  const conditions = [
    "bookings.user_id = $1",
    "bookings.status = 'scheduled'",
    `bookings.start_time ${comparator} NOW()`,
  ];

  if (filters.startDate) {
    params.push(filters.startDate);
    conditions.push(`bookings.start_time >= $${params.length}::date`);
  }

  if (filters.endDate) {
    params.push(filters.endDate);
    conditions.push(`bookings.start_time < ($${params.length}::date + INTERVAL '1 day')`);
  }

  if (eventTypeIds.length) {
    params.push(eventTypeIds);
    conditions.push(`bookings.event_type_id = ANY($${params.length}::uuid[])`);
  }

  if (inviteeEmails.length) {
    params.push(inviteeEmails);
    conditions.push(`bookings.invitee_email = ANY($${params.length}::text[])`);
  }

  const meetingsResult = await query(
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
        event_types.id AS event_type_id,
        event_types.name AS event_name,
        event_types.slug AS event_slug,
        ${
          features.eventTypeBufferBeforeMinutes
            ? "event_types.buffer_before_minutes"
            : "0 AS buffer_before_minutes"
        },
        ${
          features.eventTypeBufferAfterMinutes
            ? "event_types.buffer_after_minutes"
            : "0 AS buffer_after_minutes"
        },
        ${
          features.eventTypeLocationType
            ? "event_types.location_type"
            : "'Google Meet' AS location_type"
        },
        users.full_name AS host_name,
        users.username AS host_username
      FROM bookings
      INNER JOIN event_types ON event_types.id = bookings.event_type_id
      INNER JOIN users ON users.id = bookings.user_id
      WHERE ${conditions.join("\n        AND ")}
      ORDER BY bookings.start_time ${sort}
    `,
    params
  );

  const [eventTypesResult, inviteesResult] = await Promise.all([
    query(
      `
        SELECT id, name
        FROM event_types
        WHERE user_id = $1
        ORDER BY name ASC
      `,
      [user.id]
    ),
    query(
      `
        SELECT DISTINCT invitee_email
        FROM bookings
        WHERE user_id = $1
          AND invitee_email <> ''
        ORDER BY invitee_email ASC
      `,
      [user.id]
    ),
  ]);

  return {
    items: meetingsResult.rows,
    filters: {
      eventTypes: eventTypesResult.rows,
      inviteeEmails: inviteesResult.rows.map((row) => row.invitee_email),
      teams: [{ value: "default", label: "All Teams" }],
      hosts: [{ value: user.username, label: "Host" }],
    },
  };
}

async function cancelMeeting(meetingId) {
  const user = await getDefaultUser();
  
  // 1. Fetch details so we have the invitee's email address
  const bookingDetails = await getBookingDetails(meetingId);

  // 2. Perform the cancellation
  const result = await query(
    `
      UPDATE bookings
      SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND status = 'scheduled'
      RETURNING id
    `,
    [meetingId, user.id]
  );

  if (!result.rows[0]) {
    throw new ApiError(404, "Meeting not found.");
  }

  // 3. Send the cancellation email
  sendCancellationEmail(bookingDetails);

  return { success: true };
}

module.exports = {
  cancelMeeting,
  listMeetings,
};
