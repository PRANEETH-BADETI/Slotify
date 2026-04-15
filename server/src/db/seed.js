const { addDays, subDays } = require("date-fns");
const { fromZonedTime } = require("date-fns-tz");
const { pool } = require("../config/db");
const { env } = require("../config/env");

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        INSERT INTO users (username, full_name, email, timezone)
        VALUES ($1, 'Praneeth', 'praneethbadeti@gmail.com', 'Asia/Kolkata')
        ON CONFLICT (username)
        DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          timezone = EXCLUDED.timezone,
          updated_at = NOW()
        RETURNING id, timezone
      `,
      [env.defaultUsername]
    );

    const user = userResult.rows[0];

    await client.query("DELETE FROM bookings WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM event_types WHERE user_id = $1", [user.id]);

    const scheduleExisting = await client.query(
      "SELECT id FROM availability_schedules WHERE user_id = $1 AND is_default = true LIMIT 1",
      [user.id]
    );

    let scheduleId = scheduleExisting.rows[0]?.id;

    if (!scheduleId) {
      const scheduleResult = await client.query(
        `
          INSERT INTO availability_schedules (
            user_id,
            name,
            timezone,
            is_default,
            max_meetings_per_day,
            holiday_region
          )
          VALUES ($1, 'Working hours', $2, true, 6, 'US')
          RETURNING id
        `,
        [user.id, user.timezone]
      );

      scheduleId = scheduleResult.rows[0].id;
    } else {
      await client.query(
        `
          UPDATE availability_schedules
          SET
            timezone = $1,
            max_meetings_per_day = 6,
            holiday_region = 'US',
            updated_at = NOW()
          WHERE id = $2
        `,
        [user.timezone, scheduleId]
      );
    }

    await client.query("DELETE FROM availability_rules WHERE schedule_id = $1", [
      scheduleId,
    ]);
    await client.query("DELETE FROM schedule_holidays WHERE schedule_id = $1", [
      scheduleId,
    ]);

    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      await client.query(
        `
          INSERT INTO availability_rules (schedule_id, day_of_week, start_time, end_time)
          VALUES ($1, $2, '09:00', '17:00')
        `,
        [scheduleId, dayOfWeek]
      );
    }

    for (const holidayKey of ["new-years-day", "martin-luther-king-jr-day", "presidents-day"]) {
      await client.query(
        `
          INSERT INTO schedule_holidays (schedule_id, holiday_key)
          VALUES ($1, $2)
        `,
        [scheduleId, holidayKey]
      );
    }

    const eventRows = [];
    const eventSeeds = [
      {
        name: "30 Minute Intro",
        slug: "30-min-intro",
        description: "A quick introductory call to understand goals, blockers, and next steps.",
        durationMinutes: 30,
        bookingWindowDays: 60,
        minimumNoticeHours: 4,
        bufferBeforeMinutes: 15,
        bufferAfterMinutes: 15,
        customQuestion: "What would you like to cover during the meeting?",
      },
      {
        name: "Product Demo",
        slug: "product-demo",
        description: "Walk through the product, answer questions, and align on implementation details.",
        durationMinutes: 45,
        bookingWindowDays: 30,
        minimumNoticeHours: 8,
        bufferBeforeMinutes: 15,
        bufferAfterMinutes: 15,
        customQuestion: "Which part of the product are you most interested in?",
      },
      {
        name: "Weekly Check-in",
        slug: "weekly-check-in",
        description: "A focused sync for weekly updates, risks, and delivery planning.",
        durationMinutes: 60,
        bookingWindowDays: 21,
        minimumNoticeHours: 12,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 15,
        customQuestion: "",
      },
    ];

    for (const eventSeed of eventSeeds) {
      const eventResult = await client.query(
        `
          INSERT INTO event_types (
            user_id,
            name,
            description,
            duration_minutes,
            slug,
            location_type,
            booking_window_days,
            minimum_notice_hours,
            buffer_before_minutes,
            buffer_after_minutes,
            custom_question
          )
          VALUES ($1, $2, $3, $4, $5, 'Google Meet', $6, $7, $8, $9, $10)
          RETURNING id, duration_minutes
        `,
        [
          user.id,
          eventSeed.name,
          eventSeed.description,
          eventSeed.durationMinutes,
          eventSeed.slug,
          eventSeed.bookingWindowDays,
          eventSeed.minimumNoticeHours,
          eventSeed.bufferBeforeMinutes,
          eventSeed.bufferAfterMinutes,
          eventSeed.customQuestion,
        ]
      );

      eventRows.push(eventResult.rows[0]);
    }

    const introEvent = eventRows[0];
    const demoEvent = eventRows[1];

    const upcomingStart = fromZonedTime(
      `${formatDate(addDays(new Date(), 2))}T10:00:00`,
      user.timezone
    );
    const pastStart = fromZonedTime(
      `${formatDate(subDays(new Date(), 3))}T14:00:00`,
      user.timezone
    );

    await client.query(
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
        VALUES
          ($1, $2, 'Aarav Patel', 'aarav@example.com', 'Looking to learn more about the product.', 'Asia/Kolkata', $3, $4),
          ($5, $2, 'Maya Chen', 'maya@example.com', 'Follow-up from last week''s discussion.', 'Asia/Singapore', $6, $7)
      `,
      [
        introEvent.id,
        user.id,
        upcomingStart.toISOString(),
        addMinutes(upcomingStart, introEvent.duration_minutes).toISOString(),
        demoEvent.id,
        pastStart.toISOString(),
        addMinutes(pastStart, demoEvent.duration_minutes).toISOString(),
      ]
    );

    await client.query("COMMIT");
    console.log("Sample data seeded successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

module.exports = seed;

if (require.main === module) {
  seed()
    .then(async () => {
      await pool.end();
    })
    .catch(async (error) => {
      console.error("Failed to seed database.");
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}
