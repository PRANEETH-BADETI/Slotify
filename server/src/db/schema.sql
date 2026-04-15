CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  avatar_url TEXT,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 240),
  slug VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  location_type VARCHAR(50) NOT NULL DEFAULT 'Google Meet',
  booking_window_days INTEGER NOT NULL DEFAULT 60,
  minimum_notice_hours INTEGER NOT NULL DEFAULT 4,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0,
  custom_question TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS availability_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'Working hours',
  timezone VARCHAR(100) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT true,
  max_meetings_per_day INTEGER,
  holiday_region VARCHAR(20) NOT NULL DEFAULT 'NONE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_default_schedule_per_user
  ON availability_schedules(user_id)
  WHERE is_default = true;

CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES availability_schedules(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time < end_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_rule_window
  ON availability_rules(schedule_id, day_of_week, start_time, end_time);

CREATE TABLE IF NOT EXISTS schedule_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES availability_schedules(id) ON DELETE CASCADE,
  holiday_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, holiday_key)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_name VARCHAR(120) NOT NULL,
  invitee_email VARCHAR(255) NOT NULL,
  invitee_notes TEXT NOT NULL DEFAULT '',
  custom_question_answer TEXT NOT NULL DEFAULT '',
  invitee_timezone VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS bookings_user_time_idx
  ON bookings(user_id, start_time);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_event_start_unique
  ON bookings(event_type_id, start_time)
  WHERE status = 'scheduled';

ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) NOT NULL DEFAULT 'Google Meet',
  ADD COLUMN IF NOT EXISTS booking_window_days INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS minimum_notice_hours INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buffer_after_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_question TEXT NOT NULL DEFAULT '';

ALTER TABLE availability_schedules
  ADD COLUMN IF NOT EXISTS max_meetings_per_day INTEGER,
  ADD COLUMN IF NOT EXISTS holiday_region VARCHAR(20) NOT NULL DEFAULT 'NONE';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS custom_question_answer TEXT NOT NULL DEFAULT '';
