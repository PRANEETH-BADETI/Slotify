const { query } = require("../config/db");
const { env } = require("../config/env");
const { ApiError } = require("../utils/apiError");

async function getDefaultUser() {
  const result = await query("SELECT * FROM users WHERE username = $1 LIMIT 1", [
    env.defaultUsername,
  ]);

  if (!result.rows[0]) {
    throw new ApiError(
      500,
      "Default user not found. Run the database seed script first."
    );
  }

  return result.rows[0];
}

async function getAdminProfile() {
  const user = await getDefaultUser();

  const [eventTypesResult, upcomingMeetingsResult] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM event_types WHERE user_id = $1", [
      user.id,
    ]),
    query(
      "SELECT COUNT(*)::int AS count FROM bookings WHERE user_id = $1 AND status = 'scheduled' AND start_time >= NOW()",
      [user.id]
    ),
  ]);

  return {
    user,
    stats: {
      eventTypesCount: eventTypesResult.rows[0].count,
      upcomingMeetingsCount: upcomingMeetingsResult.rows[0].count,
    },
  };
}

module.exports = {
  getAdminProfile,
  getDefaultUser,
};
