import { formatInTimeZone } from "date-fns-tz";
import { Calendar, CheckCircle, Clock, Globe2, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getBookingConfirmation } from "../api/public";
import { LoadingState } from "../components/shared/LoadingState";

function CalendlyMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill="#006BFF" />
      <path
        d="M23.5 12.5C22.1 11.2 20.2 10.4 18 10.4C13.8 10.4 10.4 13.8 10.4 18C10.4 22.2 13.8 25.6 18 25.6C20.2 25.6 22.1 24.8 23.5 23.5"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
      <circle cx="23.5" cy="12.5" r="1.5" fill="white" />
      <circle cx="23.5" cy="23.5" r="1.5" fill="white" />
    </svg>
  );
}

export function ConfirmationPage() {
  const { bookingId, username, slug } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBooking() {
      try {
        const data = await getBookingConfirmation(bookingId);
        setBooking(data);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Failed to load booking.");
      }
    }
    loadBooking();
  }, [bookingId]);

  if (!booking && !error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#fff" }}>
        <LoadingState label="Loading confirmation..." />
      </div>
    );
  }

  const formattedTime = booking?.start_time
    ? formatInTimeZone(booking.start_time, booking.invitee_timezone, "h:mm a - EEEE, MMMM d, yyyy")
    : "";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", fontFamily: "Inter, sans-serif" }}>
      {/* Top nav */}
      <div
        style={{
          height: "52px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CalendlyMark />
          <span style={{ fontSize: "16px", fontWeight: "700", color: "#006BFF" }}>Calendly</span>
        </div>
        <span style={{ fontSize: "12px", color: "#9ca3af" }}>Powered by Calendly</span>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: "640px",
          margin: "0 auto",
          padding: "60px 24px",
          textAlign: "center",
        }}
      >
        {/* Green check */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "#D1FAE5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <CheckCircle size={32} style={{ color: "#059669" }} />
        </div>

        {/* Confirmed label */}
        <p
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "#059669",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 12px",
          }}
        >
          Confirmed
        </p>

        <h1 style={{ fontSize: "26px", fontWeight: "700", color: "#1a1a1a", margin: "0 0 8px" }}>
          You are scheduled!
        </h1>

        {error ? (
          <p style={{ fontSize: "14px", color: "#dc2626", marginTop: "12px" }}>{error}</p>
        ) : (
          <>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 32px", lineHeight: "1.6" }}>
              A calendar invitation has been sent to your email address.
            </p>

            {/* Booking details card */}
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "28px",
                textAlign: "left",
                marginBottom: "28px",
              }}
            >
              {/* Event type badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  backgroundColor: "#EBF5FF",
                  color: "#006BFF",
                  borderRadius: "4px",
                  padding: "3px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  marginBottom: "14px",
                }}
              >
                {booking.event_name}
              </div>

              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 20px" }}>
                {booking.event_name} — {booking.full_name}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Calendar size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", color: "#374151" }}>{formattedTime}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Clock size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", color: "#374151" }}>
                    {booking.duration_minutes || 30} minutes
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Video size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", color: "#374151" }}>
                    {booking.location_type || "Google Meet"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Globe2 size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", color: "#374151" }}>{booking.invitee_timezone}</span>
                </div>
              </div>
            </div>

            {/* Invitee info */}
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "20px 28px",
                textAlign: "left",
                marginBottom: "32px",
              }}
            >
              <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px" }}>
                Invitee Information
              </h3>
              <p style={{ fontSize: "14px", color: "#1a1a1a", margin: "0 0 4px", fontWeight: "500" }}>
                {booking.invitee_name}
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>{booking.invitee_email}</p>
              {booking.custom_question && booking.custom_question_answer ? (
                <div style={{ marginTop: "12px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", margin: "0 0 4px" }}>
                    {booking.custom_question}
                  </p>
                  <p style={{ fontSize: "13px", color: "#1a1a1a", margin: 0 }}>
                    {booking.custom_question_answer}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Back button */}
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <Link to={`/book/${username}/${slug}/reschedule/${bookingId}`}>
                <button
                  style={{
                    padding: "10px 24px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#006BFF",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textDecoration: "none",
                  }}
                >
                  Reschedule
                </button>
              </Link>

              <Link to={`/book/${username}/${slug}`}>
                <button
                  style={{
                    padding: "10px 24px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor: "#fff",
                    color: "#374151",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
                >
                  Schedule another event
                </button>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          padding: "20px",
          borderTop: "1px solid #f3f4f6",
          marginTop: "40px",
        }}
      >
        <p style={{ fontSize: "12px", color: "#9ca3af" }}>
          Powered by{" "}
          <span style={{ color: "#006BFF", fontWeight: "500" }}>Calendly</span>
          {" · "}
          <span style={{ color: "#9ca3af", cursor: "pointer" }}>Cookie settings</span>
          {" · "}
          <span style={{ color: "#9ca3af", cursor: "pointer" }}>Report abuse</span>
        </p>
      </div>
    </div>
  );
}
