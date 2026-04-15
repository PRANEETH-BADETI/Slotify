import { format } from "date-fns";
import { Clock, Globe, Mail, User, XCircle } from "lucide-react";

export function MeetingCard({ meeting, showCancel, onCancel }) {
  const startDate = new Date(meeting.start_time);
  const endDate = new Date(meeting.end_time);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "16px 0",
        borderBottom: "1px solid #f3f4f6",
        gap: "16px",
      }}
    >
      {/* Left: date column */}
      <div style={{ flexShrink: 0, width: "80px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {format(startDate, "MMM")}
        </div>
        <div style={{ fontSize: "28px", fontWeight: "700", color: "#1a1a1a", lineHeight: "1.1" }}>
          {format(startDate, "d")}
        </div>
        <div style={{ fontSize: "11px", color: "#9ca3af" }}>
          {format(startDate, "EEE")}
        </div>
      </div>

      {/* Center: details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: "#EBF5FF",
            color: "#006BFF",
            borderRadius: "4px",
            padding: "2px 8px",
            fontSize: "11px",
            fontWeight: "600",
            marginBottom: "6px",
          }}
        >
          {meeting.event_name}
        </div>
        <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 6px" }}>
          {meeting.invitee_name}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={12} style={{ color: "#9ca3af", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Mail size={12} style={{ color: "#9ca3af", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#6b7280" }}>{meeting.invitee_email}</span>
          </div>
          {meeting.invitee_timezone && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Globe size={12} style={{ color: "#9ca3af", flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "#6b7280" }}>{meeting.invitee_timezone}</span>
            </div>
          )}
          {meeting.invitee_notes && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginTop: "2px" }}>
              <User size={12} style={{ color: "#9ca3af", flexShrink: 0, marginTop: "2px" }} />
              <span style={{ fontSize: "12px", color: "#6b7280" }}>{meeting.invitee_notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: cancel button */}
      {showCancel && (
        <button
          onClick={() => onCancel(meeting.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            border: "1px solid #fca5a5",
            borderRadius: "6px",
            backgroundColor: "#fff",
            color: "#dc2626",
            fontSize: "12px",
            fontWeight: "500",
            cursor: "pointer",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fef2f2"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
        >
          <XCircle size={13} />
          Cancel
        </button>
      )}
    </div>
  );
}
