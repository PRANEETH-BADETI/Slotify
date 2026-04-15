const { query } = require("../config/db");

let featuresPromise;

async function loadFeatures() {
  const [columnsResult, tablesResult] = await Promise.all([
    query(
      `
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('event_types', 'bookings', 'availability_schedules')
      `
    ),
    query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('schedule_holidays')
      `
    ),
  ]);

  const columns = new Set(
    columnsResult.rows.map((row) => `${row.table_name}.${row.column_name}`)
  );
  const tables = new Set(tablesResult.rows.map((row) => row.table_name));

  return {
    scheduleHolidaysTable: tables.has("schedule_holidays"),
    eventTypeLocationType: columns.has("event_types.location_type"),
    eventTypeBookingWindowDays: columns.has("event_types.booking_window_days"),
    eventTypeMinimumNoticeHours: columns.has("event_types.minimum_notice_hours"),
    eventTypeBufferBeforeMinutes: columns.has("event_types.buffer_before_minutes"),
    eventTypeBufferAfterMinutes: columns.has("event_types.buffer_after_minutes"),
    eventTypeCustomQuestion: columns.has("event_types.custom_question"),
    availabilityMaxMeetingsPerDay: columns.has("availability_schedules.max_meetings_per_day"),
    availabilityHolidayRegion: columns.has("availability_schedules.holiday_region"),
    bookingCustomQuestionAnswer: columns.has("bookings.custom_question_answer"),
  };
}

async function getDbFeatures() {
  if (!featuresPromise) {
    featuresPromise = loadFeatures().catch((error) => {
      featuresPromise = null;
      throw error;
    });
  }

  return featuresPromise;
}

module.exports = {
  getDbFeatures,
};
