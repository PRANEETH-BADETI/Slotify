import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Clock, Globe2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createBooking,
  getBookingConfirmation,
  getPublicAvailability,
  rescheduleBooking,
} from "../api/public";
import { LoadingState } from "../components/shared/LoadingState";
import { timezones } from "../lib/timezones";
import "react-day-picker/dist/style.css";

function CalendlyMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill="#006BFF" />
      <path
        d="M23.5 12.5C22.1 11.2 20.2 10.4 18 10.4C13.8 10.4 10.4 13.8 10.4 18C10.4 22.2 13.8 25.6 18 25.6C20.2 25.6 22.1 24.8 23.5 23.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="23.5" cy="12.5" r="1.5" fill="white" />
      <circle cx="23.5" cy="23.5" r="1.5" fill="white" />
    </svg>
  );
}

export function BookingPage() {
  const navigate = useNavigate();
  const { username, slug, bookingId } = useParams();
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [bookingData, setBookingData] = useState(null);
  const [existingBooking, setExistingBooking] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [viewerTimezone, setViewerTimezone] = useState(browserTimezone);
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [step, setStep] = useState("calendar");
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === "undefined" ? 1200 : window.innerWidth
  );
  const [form, setForm] = useState({
    inviteeName: "",
    inviteeEmail: "",
    inviteeNotes: "",
    customQuestionAnswer: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRescheduling = Boolean(bookingId);
  const isMobile = viewportWidth < 860;

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    async function loadExistingBooking() {
      if (!bookingId) {
        return;
      }

      try {
        const data = await getBookingConfirmation(bookingId);
        setExistingBooking(data);
        setForm({
          inviteeName: data.invitee_name || "",
          inviteeEmail: data.invitee_email || "",
          inviteeNotes: data.invitee_notes || "",
          customQuestionAnswer: data.custom_question_answer || "",
        });
        setViewerTimezone(data.invitee_timezone || browserTimezone);
        setMonth(format(new Date(data.start_time), "yyyy-MM"));
        const currentDay = new Date(data.start_time);
        setSelectedDay(currentDay);
        setSelectedSlot({
          startTime: data.start_time,
          label: formatInTimeZone(data.start_time, data.invitee_timezone || browserTimezone, "h:mm a"),
        });
        setError("");
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Failed to load booking.");
      }
    }

    loadExistingBooking();
  }, [bookingId, browserTimezone]);

  useEffect(() => {
    async function loadAvailability() {
      try {
        const data = await getPublicAvailability(username, slug, {
          month,
          timezone: viewerTimezone,
          rescheduleBookingId: bookingId || undefined,
        });
        setBookingData(data);
        setError("");
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Failed to load booking page.");
      }
    }

    loadAvailability();
  }, [bookingId, month, slug, username, viewerTimezone]);

  const availableDateMap = useMemo(() => {
    if (!bookingData) {
      return new Map();
    }

    return new Map(bookingData.days.map((day) => [day.date, day]));
  }, [bookingData]);

  const disabledDates = useMemo(() => {
    const disabled = [{ before: new Date() }];

    if (bookingData?.days) {
      bookingData.days.forEach((day) => {
        if (day.slotCount === 0) {
          disabled.push(new Date(`${day.date}T00:00:00`));
        }
      });
    }

    return disabled;
  }, [bookingData]);

  const availableDates = useMemo(
    () =>
      bookingData?.days
        ?.filter((day) => day.slotCount > 0)
        .map((day) => new Date(`${day.date}T00:00:00`)) || [],
    [bookingData]
  );

  const slotsForSelectedDay = selectedDay
    ? availableDateMap.get(format(selectedDay, "yyyy-MM-dd"))?.slots || []
    : [];

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedSlot) {
      setError("Choose a time slot before booking.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...form,
        inviteeTimezone: viewerTimezone,
        startTime: selectedSlot.startTime,
      };
      const booking = isRescheduling
        ? await rescheduleBooking(bookingId, payload)
        : await createBooking(username, slug, payload);
      navigate(`/book/${username}/${slug}/confirmation/${booking.id}`);
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Failed to save booking.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if ((!bookingData && !error) || (isRescheduling && !existingBooking && !error)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <LoadingState label={isRescheduling ? "Loading reschedule page..." : "Loading booking page..."} />
      </div>
    );
  }

  const event = bookingData?.event || existingBooking || {};
  const eventName = event.name || event.event_name || "Meeting";
  const hostName = event.full_name || username;
  const duration = event.duration_minutes || 30;
  const hostTimezone = event.schedule_timezone || "UTC";
  const locationType = event.location_type || "Google Meet";
  const customQuestion = event.custom_question || "";
  const hostInitial = hostName.charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", fontFamily: "Inter, sans-serif" }}>
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
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#006BFF" }}>Slotify</span>
        </div>
        <a
          href="https://calendly.com"
          style={{ fontSize: "12px", color: "#6b7280", textDecoration: "none" }}
        >
          Powered by Slotify
        </a>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "340px minmax(0, 1fr)",
          minHeight: "calc(100vh - 52px)",
          maxWidth: "960px",
          margin: "0 auto",
          borderLeft: "1px solid #e5e7eb",
          borderRight: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            borderRight: isMobile ? "none" : "1px solid #e5e7eb",
            borderBottom: isMobile ? "1px solid #e5e7eb" : "none",
            padding: isMobile ? "24px 20px" : "32px 28px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              backgroundColor: "#4F46E5",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            {hostInitial}
          </div>

          <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 6px" }}>{hostName}</p>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#1a1a1a",
              margin: "0 0 20px",
              lineHeight: 1.2,
            }}
          >
            {eventName}
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <InfoRow icon={<Clock size={16} style={{ color: "#6b7280" }} />}>
              {duration} min
            </InfoRow>
            <InfoRow icon={<Video size={16} style={{ color: "#6b7280" }} />}>
              {locationType}
            </InfoRow>
            <InfoRow icon={<Globe2 size={16} style={{ color: "#6b7280" }} />}>
              {hostTimezone}
            </InfoRow>
          </div>

          {event.description || event.event_description ? (
            <p style={{ marginTop: "20px", fontSize: "13px", color: "#6b7280", lineHeight: 1.6 }}>
              {event.description || event.event_description}
            </p>
          ) : null}

          {selectedSlot && step === "form" ? (
            <div
              style={{
                marginTop: "24px",
                padding: "14px",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            >
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 4px" }}>Selected time</p>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
                {selectedDay ? format(selectedDay, "EEEE, MMMM d") : ""}
              </p>
              <p style={{ fontSize: "13px", color: "#374151", margin: "4px 0 0" }}>
                {formatInTimeZone(selectedSlot.startTime, viewerTimezone, "h:mm a zzz")}
              </p>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0" }}>{duration} min</p>
            </div>
          ) : null}
        </div>

        <div style={{ padding: isMobile ? "24px 20px" : "32px" }}>
          {step === "calendar" ? (
            <>
              <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 4px" }}>
                {isRescheduling ? "Select a New Date & Time" : "Select a Date & Time"}
              </h2>

              {error ? (
                <p style={{ fontSize: "13px", color: "#dc2626", marginBottom: "12px" }}>{error}</p>
              ) : null}

              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: isMobile ? "24px" : "32px",
                  alignItems: "flex-start",
                  marginTop: "16px",
                }}
              >
                <div style={{ width: isMobile ? "100%" : "auto", flexShrink: 0 }}>
                  <DayPicker
                    mode="single"
                    selected={selectedDay}
                    month={new Date(`${month}-01T00:00:00`)}
                    onMonthChange={(nextMonth) => setMonth(format(nextMonth, "yyyy-MM"))}
                    onSelect={(date) => {
                      setSelectedDay(date);
                      setSelectedSlot(null);
                    }}
                    disabled={disabledDates}
                    modifiers={{ available: availableDates }}
                    modifiersStyles={{
                      available: {
                        fontWeight: 700,
                        color: "#1a1a1a",
                      },
                    }}
                    styles={{
                      caption: { padding: "0 0 12px" },
                    }}
                  />

                  <div style={{ marginTop: "12px", width: isMobile ? "100%" : "auto" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "6px",
                      }}
                    >
                      <Globe2 size={13} style={{ color: "#6b7280" }} />
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>Time zone</span>
                    </div>
                    <select
                      value={viewerTimezone}
                      onChange={(event) => setViewerTimezone(event.target.value)}
                      style={timezoneSelectStyle}
                    >
                      {[viewerTimezone, ...timezones.filter((timezone) => timezone !== viewerTimezone)].map((timezone) => (
                        <option key={timezone} value={timezone}>
                          {timezone}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedDay ? (
                  <div style={{ flex: 1, width: "100%" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 12px" }}>
                      {format(selectedDay, "EEEE, MMMM d")}
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        maxHeight: isMobile ? "none" : "360px",
                        overflowY: isMobile ? "visible" : "auto",
                        paddingRight: isMobile ? 0 : "4px",
                      }}
                    >
                      {slotsForSelectedDay.length ? (
                        slotsForSelectedDay.map((slot) => {
                          const isSelected = selectedSlot?.startTime === slot.startTime;

                          return (
                            <div
                              key={slot.startTime}
                              style={{
                                display: "flex",
                                flexDirection: isMobile ? "column" : "row",
                                gap: "8px",
                              }}
                            >
                              <button
                                type="button"
                                style={{
                                  flex: isMobile ? 1 : isSelected ? 0.6 : 1,
                                  padding: "10px",
                                  border: `1px solid ${isSelected ? "#006BFF" : "#d1d5db"}`,
                                  borderRadius: "6px",
                                  backgroundColor: isSelected ? "#EBF5FF" : "#FFFFFF",
                                  color: isSelected ? "#006BFF" : "#374151",
                                  fontSize: "14px",
                                  fontWeight: isSelected ? 600 : 400,
                                  cursor: "pointer",
                                  textAlign: "center",
                                }}
                                onClick={() => setSelectedSlot(slot)}
                              >
                                {slot.label}
                              </button>
                              {isSelected ? (
                                <button
                                  type="button"
                                  onClick={() => setStep("form")}
                                  style={nextButtonStyle}
                                >
                                  Next <ChevronRight size={15} />
                                </button>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <p style={{ fontSize: "13px", color: "#9ca3af" }}>
                          No available times for this date.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ fontSize: "13px", color: "#9ca3af" }}>
                      Select a date to see available times.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <button
                  type="button"
                  onClick={() => setStep("calendar")}
                  style={backButtonStyle}
                >
                  <ChevronLeft size={15} />
                  Back
                </button>
                <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
                  {isRescheduling ? "Update Details" : "Enter Details"}
                </h2>
              </div>

              {error ? (
                <p style={{ fontSize: "13px", color: "#dc2626", marginBottom: "12px" }}>{error}</p>
              ) : null}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <Field
                  label="Name"
                  required
                  value={form.inviteeName}
                  onChange={(value) => setForm((current) => ({ ...current, inviteeName: value }))}
                  placeholder="Your name"
                />

                <Field
                  label="Email"
                  required
                  type="email"
                  value={form.inviteeEmail}
                  onChange={(value) => setForm((current) => ({ ...current, inviteeEmail: value }))}
                  placeholder="your@email.com"
                />

                <TextAreaField
                  label="Please share anything that will help prepare for our meeting."
                  value={form.inviteeNotes}
                  onChange={(value) => setForm((current) => ({ ...current, inviteeNotes: value }))}
                  placeholder="Add notes..."
                />

                {customQuestion ? (
                  <TextAreaField
                    label={customQuestion}
                    value={form.customQuestionAnswer}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, customQuestionAnswer: value }))
                    }
                    placeholder="Your response"
                  />
                ) : null}

                <p style={{ fontSize: "11px", color: "#9ca3af", lineHeight: 1.5 }}>
                  By proceeding, you confirm that you have read and agree to Calendly&apos;s Terms of Use and Privacy Notice.
                </p>

                <button type="submit" disabled={isSubmitting} style={submitButtonStyle(isSubmitting)}>
                  {isSubmitting
                    ? isRescheduling
                      ? "Rescheduling..."
                      : "Scheduling..."
                    : isRescheduling
                      ? "Reschedule Event"
                      : "Schedule Event"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {icon}
      <span style={{ fontSize: "14px", color: "#374151" }}>{children}</span>
    </div>
  );
}

function Field({ label, required = false, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label style={fieldLabelStyle}>
        {label} {required ? <span style={{ color: "#dc2626" }}>*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={fieldLabelStyle}>{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        style={textareaStyle}
      />
    </div>
  );
}

const timezoneSelectStyle = {
  width: "100%",
  height: "34px",
  padding: "0 8px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "12px",
  color: "#374151",
  outline: "none",
  backgroundColor: "#FFFFFF",
  cursor: "pointer",
};

const nextButtonStyle = {
  flex: 0.4,
  padding: "10px",
  border: "none",
  borderRadius: "6px",
  backgroundColor: "#006BFF",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
};

const backButtonStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#6b7280",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "13px",
  padding: 0,
};

const fieldLabelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  height: "40px",
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  color: "#1a1a1a",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  color: "#1a1a1a",
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function submitButtonStyle(disabled) {
  return {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: disabled ? "#93c5fd" : "#006BFF",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
