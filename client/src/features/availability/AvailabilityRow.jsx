import { Plus, X } from "lucide-react";
import { timeOptions } from "../../lib/timezones";

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function AvailabilityRow({ day, onToggle, onChange }) {
  const dayInitial = DAY_INITIALS[day.dayOfWeek];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
      <button
        type="button"
        onClick={() => onToggle(day.dayOfWeek, !day.enabled)}
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "999px",
          border: "none",
          backgroundColor: day.enabled ? "#0D4C92" : "#E5EDF8",
          color: day.enabled ? "#FFFFFF" : "#5b6b7f",
          fontSize: "13px",
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {dayInitial}
      </button>

      {!day.enabled ? (
        <>
          <span style={{ minWidth: "110px", fontSize: "14px", color: "#6b7c93" }}>Unavailable</span>
          <button
            type="button"
            onClick={() => onToggle(day.dayOfWeek, true)}
            style={iconButtonStyle}
          >
            <Plus size={16} />
          </button>
        </>
      ) : (
        <>
          <TimeSelect
            value={day.startTime}
            onChange={(value) => onChange(day.dayOfWeek, "startTime", value)}
          />
          <span style={{ color: "#0f294d", fontSize: "14px" }}>-</span>
          <TimeSelect
            value={day.endTime}
            onChange={(value) => onChange(day.dayOfWeek, "endTime", value)}
          />
          <button
            type="button"
            onClick={() => onToggle(day.dayOfWeek, false)}
            style={iconButtonStyle}
          >
            <X size={16} />
          </button>
        </>
      )}
    </div>
  );
}

function TimeSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{
        width: "110px",
        height: "44px",
        borderRadius: "12px",
        border: "1px solid #eef3f8",
        backgroundColor: "#F7F9FC",
        color: "#0f294d",
        fontSize: "14px",
        padding: "0 14px",
        outline: "none",
      }}
    >
      {timeOptions.map((timeValue) => (
        <option key={timeValue} value={timeValue}>
          {formatTime(timeValue)}
        </option>
      ))}
    </select>
  );
}

function formatTime(value) {
  const [hourValue, minuteValue] = value.split(":").map(Number);
  const suffix = hourValue >= 12 ? "pm" : "am";
  const normalizedHour = hourValue % 12 || 12;

  return `${normalizedHour}:${String(minuteValue).padStart(2, "0")}${suffix}`;
}

const iconButtonStyle = {
  width: "28px",
  height: "28px",
  border: "none",
  background: "none",
  color: "#45607f",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
