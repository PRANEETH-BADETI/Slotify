import { ChevronDown, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAvailability, updateAvailability } from "../api/admin";
import { LoadingState } from "../components/shared/LoadingState";
import { AvailabilityRow } from "../features/availability/AvailabilityRow";
import { useAdminLayout } from "../hooks/useAdminLayout";
import { timezones } from "../lib/timezones";

const TABS = ["Schedules", "Advanced settings"];

export function AvailabilityPage() {
  const { profile } = useAdminLayout();
  const [form, setForm] = useState(null);
  const [activeTab, setActiveTab] = useState("Schedules");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadAvailability() {
      try {
        const data = await getAvailability();
        setForm(data);
        setError("");
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Failed to load availability.");
      }
    }

    loadAvailability();
  }, []);

  const holidayOptions = useMemo(() => form?.holidayOptions || [], [form?.holidayOptions]);
  const holidaysEnabled = (form?.holidayRegion || "NONE") !== "NONE";

  function updateDay(dayOfWeek, field, value) {
    setForm((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      ),
    }));
  }

  function toggleHoliday(holidayKey) {
    setForm((current) => {
      const enabledHolidayKeys = current.enabledHolidayKeys.includes(holidayKey)
        ? current.enabledHolidayKeys.filter((key) => key !== holidayKey)
        : [...current.enabledHolidayKeys, holidayKey];

      return {
        ...current,
        enabledHolidayKeys,
      };
    });
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      const nextValue = await updateAvailability(form);
      setForm(nextValue);
      setError("");
      setSuccessMessage("Availability updated.");
      window.setTimeout(() => setSuccessMessage(""), 2200);
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Failed to update availability.");
      setSuccessMessage("");
    } finally {
      setIsSaving(false);
    }
  }

  if (!form && !error) {
    return (
      <div style={{ padding: "24px 32px" }}>
        <LoadingState label="Loading availability..." />
      </div>
    );
  }

  return (
    <div className="availability-page">
      <section className="availability-page__header">
        <h1 style={{ margin: "0 0 24px", fontSize: "22px", fontWeight: 700, color: "#0f294d" }}>
          Availability
        </h1>

        <div style={{ display: "flex", gap: "28px", overflowX: "auto" }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none",
                border: "none",
                padding: "0 0 14px",
                borderBottom: activeTab === tab ? "3px solid #006BFF" : "3px solid transparent",
                color: "#0f294d",
                fontSize: "15px",
                fontWeight: activeTab === tab ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <section className="availability-page__content">
        {error ? <p style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 12px" }}>{error}</p> : null}
        {successMessage ? (
          <p style={{ color: "#059669", fontSize: "13px", margin: "0 0 12px" }}>{successMessage}</p>
        ) : null}

        {form ? (
          activeTab === "Schedules" ? (
            <div className="availability-card">
              <div className="availability-card__top">
                <div>
                  <p style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 600, color: "#45607f" }}>
                    Schedule
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px", fontWeight: 700, color: "#006BFF" }}>
                      Working hours (default)
                    </span>
                    <ChevronDown size={16} color="#006BFF" />
                  </div>
                  <p style={{ margin: "14px 0 0", fontSize: "14px", color: "#0f294d" }}>
                    Active on:{" "}
                    <span style={{ color: "#006BFF", fontWeight: 500 }}>
                      {profile?.stats?.eventTypesCount || 0} event type
                      {(profile?.stats?.eventTypesCount || 0) === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="availability-card__body">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <Clock3 size={18} color="#0f294d" />
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f294d" }}>
                    Weekly hours
                  </h2>
                </div>
                <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#45607f" }}>
                  Set when you are typically available for meetings
                </p>

                <div style={{ marginBottom: "20px", maxWidth: "360px" }}>
                  <select
                    value={form.timezone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, timezone: event.target.value }))
                    }
                    style={selectStyle}
                  >
                    {timezones.map((timezone) => (
                      <option key={timezone} value={timezone}>
                        {timezone}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {form.days.map((day) => (
                    <AvailabilityRow
                      key={day.dayOfWeek}
                      day={day}
                      onToggle={(dayOfWeek, enabled) => updateDay(dayOfWeek, "enabled", enabled)}
                      onChange={updateDay}
                    />
                  ))}
                </div>

                <div style={{ marginTop: "28px" }}>
                  <button type="button" onClick={handleSave} disabled={isSaving} style={saveButtonStyle(isSaving)}>
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="availability-card">
              <div className="availability-card__section">
                <h2 style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 700, color: "#0f294d" }}>
                  Advanced settings
                </h2>
                <p style={{ margin: 0, fontSize: "14px", color: "#45607f" }}>
                  Control availability across all your event types
                </p>
              </div>

              <div className="availability-card__section">
                <h3 style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 700, color: "#0f294d" }}>
                  Meeting limits
                </h3>
                <p style={{ margin: "0 0 18px", fontSize: "14px", color: "#45607f" }}>
                  Set a maximum number of total meetings. You can also set specific limits within individual events.
                </p>

                {form.maxMeetingsPerDay ? (
                  <div className="availability-card__inline-row">
                    <input
                      type="number"
                      min="1"
                      value={form.maxMeetingsPerDay}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          maxMeetingsPerDay: Number(event.target.value),
                        }))
                      }
                      style={{ ...selectStyle, maxWidth: "220px" }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          maxMeetingsPerDay: null,
                        }))
                      }
                      style={textLinkButtonStyle}
                    >
                      Remove limit
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        maxMeetingsPerDay: 6,
                      }))
                    }
                    style={textLinkButtonStyle}
                  >
                    + Add a meeting limit
                  </button>
                )}
              </div>

              <div className="availability-card__section">
                <h3 style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 700, color: "#0f294d" }}>
                  Holidays
                </h3>
                <p style={{ margin: "0 0 18px", fontSize: "14px", color: "#45607f" }}>
                  Slotify will automatically mark you as unavailable for the selected holidays.
                </p>

                <div className="availability-holidays">
                  <div className="availability-holidays__header">
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#45607f" }}>Country for holidays</p>
                      <select
                        value={form.holidayRegion}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            holidayRegion: event.target.value,
                            enabledHolidayKeys:
                              event.target.value === "NONE" ? [] : current.enabledHolidayKeys,
                          }))
                        }
                        style={{ ...selectStyle, maxWidth: "260px", height: "40px" }}
                      >
                        <option value="NONE">None</option>
                        <option value="US">United States</option>
                      </select>
                    </div>

                    <Toggle
                      checked={holidaysEnabled}
                      onChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          holidayRegion: checked ? "US" : "NONE",
                          enabledHolidayKeys: checked ? current.enabledHolidayKeys : [],
                        }))
                      }
                    />
                  </div>

                  {holidaysEnabled && holidayOptions.length ? (
                    holidayOptions.map((holiday) => (
                      <div key={holiday.key} className="availability-holidays__row">
                        <span style={{ fontSize: "14px", fontWeight: 500, color: "#0f294d" }}>
                          {holiday.label}
                        </span>
                        <span style={{ fontSize: "14px", color: "#45607f" }}>
                          Next: {holiday.nextDateLabel}
                        </span>
                        <Toggle
                          checked={form.enabledHolidayKeys.includes(holiday.key)}
                          onChange={() => toggleHoliday(holiday.key)}
                        />
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "18px 16px", fontSize: "14px", color: "#45607f", textAlign: "center" }}>
                      Holidays for this region are not enabled.
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "24px" }}>
                  <button type="button" onClick={handleSave} disabled={isSaving} style={saveButtonStyle(isSaving)}>
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: "48px",
        height: "28px",
        borderRadius: "999px",
        border: "none",
        padding: "3px",
        backgroundColor: checked ? "#006BFF" : "#E3EAF3",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          display: "block",
          width: "22px",
          height: "22px",
          borderRadius: "999px",
          backgroundColor: "#FFFFFF",
          transform: checked ? "translateX(20px)" : "translateX(0)",
          transition: "transform 0.18s ease",
          boxShadow: "0 1px 2px rgba(15, 41, 77, 0.22)",
        }}
      />
    </button>
  );
}

const selectStyle = {
  width: "100%",
  height: "44px",
  borderRadius: "12px",
  border: "1px solid #dbe4f0",
  padding: "0 14px",
  fontSize: "14px",
  color: "#0f294d",
  outline: "none",
  backgroundColor: "#FFFFFF",
};

const textLinkButtonStyle = {
  border: "none",
  background: "none",
  color: "#006BFF",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};

function saveButtonStyle(disabled) {
  return {
    height: "44px",
    borderRadius: "999px",
    border: "none",
    backgroundColor: disabled ? "#8ab8ff" : "#006BFF",
    color: "#FFFFFF",
    padding: "0 22px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
