const {
  addDays,
  addHours,
  addMinutes,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} = require("date-fns");
const { formatInTimeZone, fromZonedTime } = require("date-fns-tz");

const SLOT_STEP_MINUTES = 15;

function createUtcDateFromLocal(dateKey, time, timezone) {
  return fromZonedTime(`${dateKey}T${time}:00`, timezone);
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function getMonthRange(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const monthDate = new Date(year, month - 1, 1);

  return {
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  };
}

function getDateKeyInTimezone(date, timezone) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

function buildMonthlyAvailability({
  monthKey,
  rules,
  bookings,
  durationMinutes,
  hostTimezone,
  viewerTimezone,
  blockedDateKeys = new Set(),
  maxMeetingsPerDay = null,
  bookingWindowDays = 60,
  minimumNoticeHours = 4,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0,
}) {
  const { start, end } = getMonthRange(monthKey);
  const now = new Date();
  const earliestAllowed = addHours(now, minimumNoticeHours);
  const latestAllowed = addDays(now, bookingWindowDays);

  return eachDayOfInterval({ start, end }).map((date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const hostDay = createUtcDateFromLocal(dateKey, "12:00", hostTimezone).getUTCDay();
    const rule = rules.find((item) => item.day_of_week === hostDay);

    if (!rule || blockedDateKeys.has(dateKey)) {
      return { date: dateKey, slotCount: 0, slots: [] };
    }

    const dailyBookings = bookings.filter(
      (booking) => getDateKeyInTimezone(new Date(booking.start_time), hostTimezone) === dateKey
    );

    if (maxMeetingsPerDay && dailyBookings.length >= maxMeetingsPerDay) {
      return { date: dateKey, slotCount: 0, slots: [] };
    }

    const rangeStart = createUtcDateFromLocal(
      dateKey,
      rule.start_time.slice(0, 5),
      hostTimezone
    );
    const rangeEnd = createUtcDateFromLocal(
      dateKey,
      rule.end_time.slice(0, 5),
      hostTimezone
    );
    const slots = [];

    for (
      let cursor = rangeStart;
      addMinutes(cursor, durationMinutes) <= rangeEnd;
      cursor = addMinutes(cursor, SLOT_STEP_MINUTES)
    ) {
      const slotStart = cursor;
      const slotEnd = addMinutes(slotStart, durationMinutes);

      if (slotStart <= now || slotStart < earliestAllowed || slotStart > latestAllowed) {
        continue;
      }

      const blockedByBuffer = bookings.some((booking) =>
        overlaps(
          addMinutes(slotStart, -bufferBeforeMinutes),
          addMinutes(slotEnd, bufferAfterMinutes),
          addMinutes(new Date(booking.start_time), -(booking.buffer_before_minutes || 0)),
          addMinutes(new Date(booking.end_time), booking.buffer_after_minutes || 0)
        )
      );

      if (!blockedByBuffer) {
        slots.push({
          startTime: slotStart.toISOString(),
          label: formatInTimeZone(slotStart, viewerTimezone, "h:mm a"),
        });
      }
    }

    return {
      date: dateKey,
      slotCount: slots.length,
      slots,
    };
  });
}

module.exports = {
  SLOT_STEP_MINUTES,
  buildMonthlyAvailability,
  createUtcDateFromLocal,
  getDateKeyInTimezone,
  overlaps,
};
