const { query } = require("../config/db");
const { ApiError } = require("../utils/apiError");
const { getDbFeatures } = require("../utils/dbFeatures");
const { getDefaultUser } = require("./userService");

async function listEventTypes() {
  const user = await getDefaultUser();
  const result = await query(
    `
      SELECT
        event_types.*,
        COUNT(bookings.id)::int AS bookings_count
      FROM event_types
      LEFT JOIN bookings
        ON bookings.event_type_id = event_types.id
        AND bookings.status = 'scheduled'
      WHERE event_types.user_id = $1
      GROUP BY event_types.id
      ORDER BY event_types.created_at DESC
    `,
    [user.id]
  );

  return {
    username: user.username,
    fullName: user.full_name,
    items: result.rows.map(withEventTypeDefaults),
  };
}

async function createEventType(payload) {
  const user = await getDefaultUser();
  const features = await getDbFeatures();

  try {
    const advancedEnabled =
      features.eventTypeLocationType &&
      features.eventTypeBookingWindowDays &&
      features.eventTypeMinimumNoticeHours &&
      features.eventTypeBufferBeforeMinutes &&
      features.eventTypeBufferAfterMinutes &&
      features.eventTypeCustomQuestion;

    const result = advancedEnabled
      ? await query(
          `
            INSERT INTO event_types (
              user_id,
              name,
              description,
              duration_minutes,
              slug,
              is_active,
              location_type,
              booking_window_days,
              minimum_notice_hours,
              buffer_before_minutes,
              buffer_after_minutes,
              custom_question
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
          `,
          [
            user.id,
            payload.name,
            payload.description || "",
            payload.durationMinutes,
            payload.slug,
            payload.isActive,
            payload.locationType,
            payload.bookingWindowDays,
            payload.minimumNoticeHours,
            payload.bufferBeforeMinutes,
            payload.bufferAfterMinutes,
            payload.customQuestion || "",
          ]
        )
      : await query(
          `
            INSERT INTO event_types (
              user_id,
              name,
              description,
              duration_minutes,
              slug,
              is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `,
          [
            user.id,
            payload.name,
            payload.description || "",
            payload.durationMinutes,
            payload.slug,
            payload.isActive,
          ]
        );

    return withEventTypeDefaults(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      throw new ApiError(409, "That booking link slug is already in use.");
    }

    throw error;
  }
}

async function updateEventType(eventTypeId, payload) {
  const user = await getDefaultUser();
  const features = await getDbFeatures();
  try {
    const advancedEnabled =
      features.eventTypeLocationType &&
      features.eventTypeBookingWindowDays &&
      features.eventTypeMinimumNoticeHours &&
      features.eventTypeBufferBeforeMinutes &&
      features.eventTypeBufferAfterMinutes &&
      features.eventTypeCustomQuestion;

    const result = advancedEnabled
      ? await query(
          `
            UPDATE event_types
            SET
              name = $1,
              description = $2,
              duration_minutes = $3,
              slug = $4,
              is_active = $5,
              location_type = $6,
              booking_window_days = $7,
              minimum_notice_hours = $8,
              buffer_before_minutes = $9,
              buffer_after_minutes = $10,
              custom_question = $11,
              updated_at = NOW()
            WHERE id = $12 AND user_id = $13
            RETURNING *
          `,
          [
            payload.name,
            payload.description || "",
            payload.durationMinutes,
            payload.slug,
            payload.isActive,
            payload.locationType,
            payload.bookingWindowDays,
            payload.minimumNoticeHours,
            payload.bufferBeforeMinutes,
            payload.bufferAfterMinutes,
            payload.customQuestion || "",
            eventTypeId,
            user.id,
          ]
        )
      : await query(
          `
            UPDATE event_types
            SET
              name = $1,
              description = $2,
              duration_minutes = $3,
              slug = $4,
              is_active = $5,
              updated_at = NOW()
            WHERE id = $6 AND user_id = $7
            RETURNING *
          `,
          [
            payload.name,
            payload.description || "",
            payload.durationMinutes,
            payload.slug,
            payload.isActive,
            eventTypeId,
            user.id,
          ]
        );

    if (!result.rows[0]) {
      throw new ApiError(404, "Event type not found.");
    }

    return withEventTypeDefaults(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      throw new ApiError(409, "That booking link slug is already in use.");
    }

    throw error;
  }
}

async function deleteEventType(eventTypeId) {
  const user = await getDefaultUser();
  const result = await query(
    "DELETE FROM event_types WHERE id = $1 AND user_id = $2 RETURNING id",
    [eventTypeId, user.id]
  );

  if (!result.rows[0]) {
    throw new ApiError(404, "Event type not found.");
  }

  return { success: true };
}

async function bulkUpdateEventTypes({ ids, action, isActive }) {
  const user = await getDefaultUser();

  if (action === "delete") {
    await query(
      `
        DELETE FROM event_types
        WHERE user_id = $1
          AND id = ANY($2::uuid[])
      `,
      [user.id, ids]
    );

    return { success: true };
  }

  const nextActive = typeof isActive === "boolean" ? isActive : true;
  await query(
    `
      UPDATE event_types
      SET is_active = $1, updated_at = NOW()
      WHERE user_id = $2
        AND id = ANY($3::uuid[])
    `,
    [nextActive, user.id, ids]
  );

  return { success: true };
}

async function getPublicEvent(username, slug) {
  const features = await getDbFeatures();
  const result = await query(
    `
      SELECT
        event_types.id,
        event_types.name,
        event_types.description,
        event_types.duration_minutes,
        event_types.slug,
        ${
          features.eventTypeLocationType
            ? "event_types.location_type"
            : "'Google Meet' AS location_type"
        },
        ${
          features.eventTypeBookingWindowDays
            ? "event_types.booking_window_days"
            : "60 AS booking_window_days"
        },
        ${
          features.eventTypeMinimumNoticeHours
            ? "event_types.minimum_notice_hours"
            : "4 AS minimum_notice_hours"
        },
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
          features.eventTypeCustomQuestion
            ? "event_types.custom_question"
            : "'' AS custom_question"
        },
        users.username,
        users.full_name,
        users.email,
        users.timezone,
        availability_schedules.id AS schedule_id,
        availability_schedules.timezone AS schedule_timezone,
        ${
          features.availabilityMaxMeetingsPerDay
            ? "availability_schedules.max_meetings_per_day"
            : "NULL::integer AS max_meetings_per_day"
        },
        ${
          features.availabilityHolidayRegion
            ? "availability_schedules.holiday_region"
            : "'NONE' AS holiday_region"
        }
      FROM event_types
      INNER JOIN users ON users.id = event_types.user_id
      LEFT JOIN availability_schedules
        ON availability_schedules.user_id = users.id
        AND availability_schedules.is_default = true
      WHERE users.username = $1
        AND event_types.slug = $2
        AND event_types.is_active = true
      LIMIT 1
    `,
    [username, slug]
  );

  if (!result.rows[0]) {
    throw new ApiError(404, "Event type not found.");
  }

  return withEventTypeDefaults(result.rows[0]);
}

function withEventTypeDefaults(row) {
  return {
    ...row,
    location_type: row.location_type || "Google Meet",
    booking_window_days: row.booking_window_days ?? 60,
    minimum_notice_hours: row.minimum_notice_hours ?? 4,
    buffer_before_minutes: row.buffer_before_minutes ?? 0,
    buffer_after_minutes: row.buffer_after_minutes ?? 0,
    custom_question: row.custom_question || "",
  };
}

module.exports = {
  bulkUpdateEventTypes,
  createEventType,
  deleteEventType,
  getPublicEvent,
  listEventTypes,
  updateEventType,
};
