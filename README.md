# Slotify - Scheduling Platform

A full-stack scheduling app inspired by Calendly, built as a workspace-based monorepo with a React frontend and Express/PostgreSQL backend.

It includes an admin experience for managing event types, availability, and meetings, plus a public booking flow with confirmation and rescheduling support.

## Highlights

- Create, edit, enable, disable, and delete event types
- Configure weekly availability and host timezone
- Set booking windows, before/after buffers
- Apply meeting-per-day limits and holiday-based availability rules
- Share public booking links per event type
- Book, confirm, reschedule, and cancel meetings
- Send reliable booking and cancellation email notifications via the Brevo HTTP API

## Tech Stack

- **Frontend:** React 18, Vite, Axios, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL with raw SQL and `pg`
- **Email Service:** Brevo API
- **Deployment:** Vercel (Frontend), Render (Backend & Database)

## Project Structure

\`\`\`text
.
|- client/   React app for admin pages and public booking flows
|- server/   Express API, SQL schema, seed script, services, validators
|- package.json
\`- README.md
\`\`\`

## Deployment Details

This project is fully configured for cloud deployment across distinct services:
- **Frontend (Vercel):** Connected via `VITE_API_URL` pointing to the backend API.
- **Backend (Render Web Service):** Node.js server configured with strict CORS rules (`CLIENT_URL`), accepting requests exclusively from the Vercel domain.
- **Database (Render PostgreSQL):** Live Postgres database. Schema setup and data seeding (`praneethbadeti` default user) are handled automatically via Render build commands.

## Getting Started 

### 1. Install Dependencies
Install dependencies for both the client and server:
\`\`\`bash
cd client && npm install
cd ../server && npm install
\`\`\`

### 2. Environment Variables
In the `server` directory, create a `.env` file:
\`\`\`env
DATABASE_URL=postgresql://user:password@localhost:5432/slotify
BREVO_API_KEY=your_brevo_api_key
\`\`\`

### 3. Database Setup
Ensure PostgreSQL is running locally, then initialize the tables and seed the data:
\`\`\`bash
cd server
node src/db/setup.js
node src/db/seed.js
\`\`\`

### 4. Run the App
You need two terminals to run the frontend and backend concurrently:
- **Terminal 1 (Backend):** `cd server && npm run dev` (Runs on port 4000)
- **Terminal 2 (Frontend):** `cd client && npm run dev` (Runs on port 5173)

## Current Routes

- Admin event types: `/event-types`
- Admin availability: `/availability`
- Admin meetings: `/meetings`
- Public booking page: `/book/:username/:slug`
- Reschedule flow: `/book/:username/:slug/reschedule/:bookingId`
- Confirmation page: `/book/:username/:slug/confirmation/:bookingId`

## API Overview

### Admin API

- `GET /api/admin/profile`
- `GET /api/admin/event-types`
- `POST /api/admin/event-types`
- `PATCH /api/admin/event-types/:eventTypeId`
- `DELETE /api/admin/event-types/:eventTypeId`
- `POST /api/admin/event-types/bulk`
- `GET /api/admin/availability`
- `PUT /api/admin/availability`
- `GET /api/admin/meetings`
- `PATCH /api/admin/meetings/:meetingId/cancel`

### Public API

- `GET /api/public/:username/:slug`
- `GET /api/public/:username/:slug/availability`
- `POST /api/public/:username/:slug/bookings`
- `GET /api/public/bookings/:bookingId`
- `PATCH /api/public/bookings/:bookingId/reschedule`

## Product Behavior

- One seeded host user (`praneeth`) is used instead of a full authentication flow.
- Event booking respects meeting duration, notice period, booking window, existing bookings, schedule rules, holidays, and daily limits.
- The meetings screen supports upcoming/past views, date filtering, event-type filtering, invitee filtering, and cancellation.
- Public booking supports timezone-aware slot selection and rescheduling from the confirmation screen.

