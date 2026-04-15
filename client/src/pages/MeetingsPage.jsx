import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  addMinutes,
  endOfMonth,
  endOfToday,
  endOfWeek,
  format,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMinutes,
} from "date-fns";
import { DayPicker } from "react-day-picker";
import { useEffect, useMemo, useState } from "react";
import { cancelMeeting, getMeetings } from "../api/admin";
import { LoadingState } from "../components/shared/LoadingState";
import "react-day-picker/dist/style.css";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

export function MeetingsPage() {
  const [query, setQuery] = useState({
    status: "upcoming",
    startDate: "",
    endDate: "",
    eventTypeIds: [],
    inviteeEmails: [],
  });
  const [meetingsData, setMeetingsData] = useState(null);
  const [error, setError] = useState("");
  const [showBuffers, setShowBuffers] = useState(false);
  const [expandedMeetingId, setExpandedMeetingId] = useState(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [eventTypePopoverOpen, setEventTypePopoverOpen] = useState(false);
  const [inviteePopoverOpen, setInviteePopoverOpen] = useState(false);
  const [dateRangeDraft, setDateRangeDraft] = useState(undefined);
  const [pendingEventTypeIds, setPendingEventTypeIds] = useState([]);
  const [pendingInviteeEmails, setPendingInviteeEmails] = useState([]);

  useEffect(() => {
    async function loadMeetings() {
      try {
        setMeetingsData(null);
        const data = await getMeetings({
          status: query.status,
          startDate: query.startDate || undefined,
          endDate: query.endDate || undefined,
          eventTypeIds: query.eventTypeIds.length ? query.eventTypeIds.join(",") : undefined,
          inviteeEmails: query.inviteeEmails.length ? query.inviteeEmails.join(",") : undefined,
        });
        setMeetingsData(data);
        setPendingEventTypeIds(query.eventTypeIds);
        setPendingInviteeEmails(query.inviteeEmails);
        setError("");
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Failed to load meetings.");
      }
    }

    loadMeetings();
  }, [query]);

  const items = useMemo(() => meetingsData?.items || [], [meetingsData?.items]);
  const count = items.length;
  const hasActiveFilters = Boolean(
    query.startDate || query.endDate || query.eventTypeIds.length || query.inviteeEmails.length
  );
  const groupedMeetings = useMemo(
    () =>
      items.reduce((groups, meeting) => {
        const heading = format(new Date(meeting.start_time), "EEEE, d MMMM yyyy");
        groups[heading] = groups[heading] || [];
        groups[heading].push(meeting);
        return groups;
      }, {}),
    [items]
  );

  async function reloadMeetings() {
    const refreshed = await getMeetings({
      status: query.status,
      startDate: query.startDate || undefined,
      endDate: query.endDate || undefined,
      eventTypeIds: query.eventTypeIds.length ? query.eventTypeIds.join(",") : undefined,
      inviteeEmails: query.inviteeEmails.length ? query.inviteeEmails.join(",") : undefined,
    });
    setMeetingsData(refreshed);
  }

  async function handleCancel(meetingId) {
    const confirmed = window.confirm("Cancel this meeting?");

    if (!confirmed) {
      return;
    }

    try {
      await cancelMeeting(meetingId);
      await reloadMeetings();
      setExpandedMeetingId(null);
    } catch (cancelError) {
      setError(cancelError.response?.data?.message || "Failed to cancel meeting.");
    }
  }

  function commitDateRange() {
    setQuery((current) => ({
      ...current,
      startDate: dateRangeDraft?.from ? format(dateRangeDraft.from, "yyyy-MM-dd") : "",
      endDate: dateRangeDraft?.to ? format(dateRangeDraft.to, "yyyy-MM-dd") : "",
    }));
    setDatePopoverOpen(false);
  }

  function clearFilters() {
    setQuery((current) => ({
      ...current,
      startDate: "",
      endDate: "",
      eventTypeIds: [],
      inviteeEmails: [],
    }));
    setPendingEventTypeIds([]);
    setPendingInviteeEmails([]);
  }

  function exportMeetings() {
    if (!items.length) {
      return;
    }

    const csv = [
      ["Invitee", "Email", "Event Type", "Start", "End", "Timezone"],
      ...items.map((meeting) => [
        meeting.invitee_name,
        meeting.invitee_email,
        meeting.event_name,
        meeting.start_time,
        meeting.end_time,
        meeting.invitee_timezone,
      ]),
    ]
      .map((row) => row.map((value) => `"${String(value || "").replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `meetings-${query.status}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="meetings-page">
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f294d", margin: 0 }}>Meetings</h1>
        
      </div>

      <div className="meetings-page__meta">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <button type="button" style={dropdownButtonStyle}>
            My Calendly
            <ChevronDown size={15} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", color: "#0f294d" }}>Show buffers</span>
            <span style={{ fontSize: "14px", color: "#6b7c93" }}>i</span>
            <Toggle checked={showBuffers} onChange={setShowBuffers} />
          </div>
        </div>

        <span style={{ fontSize: "14px", color: "#6b7c93" }}>
          Displaying {count} of {count} Events
        </span>
      </div>

      <div style={cardStyle}>
        <div className="meetings-toolbar">
          <div className="meetings-toolbar__left">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setExpandedMeetingId(null);
                  setQuery((current) => ({ ...current, status: tab.key }));
                }}
                style={tabButtonStyle(query.status === tab.key)}
              >
                {tab.label}
              </button>
            ))}

            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => {
                  setDateRangeDraft(
                    query.startDate || query.endDate
                      ? {
                          from: query.startDate ? new Date(`${query.startDate}T00:00:00`) : undefined,
                          to: query.endDate ? new Date(`${query.endDate}T00:00:00`) : undefined,
                        }
                      : undefined
                  );
                  setDatePopoverOpen((current) => !current);
                }}
                style={tabButtonStyle(datePopoverOpen || Boolean(query.startDate || query.endDate))}
              >
                Date Range
                <ChevronDown size={14} />
              </button>

              {datePopoverOpen ? (
                <div style={popoverStyle(720)}>
                  <div className="meetings-date-presets">
                    <button type="button" onClick={() => setDateRangeDraft({ from: startOfToday(), to: endOfToday() })} style={presetButtonStyle}>
                      Today
                    </button>
                    <button type="button" onClick={() => setDateRangeDraft({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) })} style={presetButtonStyle}>
                      This week
                    </button>
                    <button type="button" onClick={() => setDateRangeDraft({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })} style={presetButtonStyle}>
                      This month
                    </button>
                    <button type="button" onClick={() => setDateRangeDraft(undefined)} style={presetButtonStyle}>
                      All time
                    </button>
                  </div>

                  <DayPicker
                    mode="range"
                    numberOfMonths={2}
                    selected={dateRangeDraft}
                    onSelect={setDateRangeDraft}
                    weekStartsOn={0}
                    showOutsideDays
                  />

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setDateRangeDraft(undefined);
                        setDatePopoverOpen(false);
                      }}
                      style={secondaryPillStyle}
                    >
                      Cancel
                    </button>
                    <button type="button" onClick={commitDateRange} style={primaryPillStyle}>
                      Apply
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="meetings-toolbar__actions">
            <button type="button" onClick={exportMeetings} style={roundedActionStyle}>
              <Download size={16} />
              Export
            </button>
            <button
              type="button"
              onClick={() => setFilterPanelOpen((current) => !current)}
              style={roundedActionStyle}
            >
              <SlidersHorizontal size={16} />
              Filter
              <ChevronDown
                size={14}
                style={{ transform: filterPanelOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
          </div>
        </div>

        {filterPanelOpen ? (
          <div className="meetings-filter-panel">
            <FilterCell label="Teams">
              <button type="button" style={filterSelectButtonStyle}>
                All Teams <ChevronDown size={14} />
              </button>
            </FilterCell>
            <FilterCell label="Host">
              <button type="button" style={filterSelectButtonStyle}>
                Host <ChevronDown size={14} />
              </button>
            </FilterCell>
            <FilterCell label="Event Types">
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setEventTypePopoverOpen((current) => !current)}
                  style={filterSelectButtonStyle}
                >
                  {query.eventTypeIds.length ? `${query.eventTypeIds.length} selected` : "All Event Types"}{" "}
                  <ChevronDown size={14} />
                </button>
                {eventTypePopoverOpen ? (
                  <MultiSelectPopover
                    options={meetingsData?.filters?.eventTypes || []}
                    selectedValues={pendingEventTypeIds}
                    getValue={(option) => option.id}
                    getLabel={(option) => option.name}
                    onToggle={(value) =>
                      setPendingEventTypeIds((current) =>
                        current.includes(value)
                          ? current.filter((item) => item !== value)
                          : [...current, value]
                      )
                    }
                    onCancel={() => {
                      setPendingEventTypeIds(query.eventTypeIds);
                      setEventTypePopoverOpen(false);
                    }}
                    onApply={() => {
                      setQuery((current) => ({ ...current, eventTypeIds: [...pendingEventTypeIds] }));
                      setEventTypePopoverOpen(false);
                      setFilterPanelOpen(false);
                    }}
                  />
                ) : null}
              </div>
            </FilterCell>
            <FilterCell label="Status">
              <button type="button" style={filterSelectButtonStyle}>
                Active Events <ChevronDown size={14} />
              </button>
            </FilterCell>
            <FilterCell label="Tracking ID">
              <button type="button" style={filterSelectButtonStyle}>
                All IDs <ChevronDown size={14} />
              </button>
            </FilterCell>
            <FilterCell label="Invitee Emails">
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setInviteePopoverOpen((current) => !current)}
                  style={filterSelectButtonStyle}
                >
                  {query.inviteeEmails.length ? `${query.inviteeEmails.length} selected` : "All Invitee Emails"}{" "}
                  <ChevronDown size={14} />
                </button>
                {inviteePopoverOpen ? (
                  <MultiSelectPopover
                    options={meetingsData?.filters?.inviteeEmails || []}
                    selectedValues={pendingInviteeEmails}
                    getValue={(option) => option}
                    getLabel={(option) => option}
                    onToggle={(value) =>
                      setPendingInviteeEmails((current) =>
                        current.includes(value)
                          ? current.filter((item) => item !== value)
                          : [...current, value]
                      )
                    }
                    onCancel={() => {
                      setPendingInviteeEmails(query.inviteeEmails);
                      setInviteePopoverOpen(false);
                    }}
                    onApply={() => {
                      setQuery((current) => ({ ...current, inviteeEmails: [...pendingInviteeEmails] }));
                      setInviteePopoverOpen(false);
                      setFilterPanelOpen(false);
                    }}
                  />
                ) : null}
              </div>
            </FilterCell>
            <button type="button" onClick={clearFilters} className="meetings-filter-panel__clear">
              {hasActiveFilters ? "Clear all filters" : "No filters applied"}
            </button>
          </div>
        ) : null}

        {error ? <p style={{ padding: "16px 22px", color: "#dc2626", fontSize: "13px" }}>{error}</p> : null}

        {!meetingsData && !error ? (
          <div style={{ padding: "32px 22px" }}>
            <LoadingState label="Loading meetings..." />
          </div>
        ) : null}

        {meetingsData ? (
          <MeetingsList
            groupedMeetings={groupedMeetings}
            showBuffers={showBuffers}
            expandedMeetingId={expandedMeetingId}
            setExpandedMeetingId={setExpandedMeetingId}
            onCancel={handleCancel}
            setFilterPanelOpen={setFilterPanelOpen}
            setQuery={setQuery}
          />
        ) : null}

        {meetingsData && !count ? <EmptyMeetingsState /> : null}
      </div>
    </div>
  );
}

function MeetingsList({
  groupedMeetings,
  showBuffers,
  expandedMeetingId,
  setExpandedMeetingId,
  onCancel,
  setFilterPanelOpen,
  setQuery,
}) {
  const entries = Object.entries(groupedMeetings);

  if (!entries.length) {
    return null;
  }

  return (
    <div>
      {entries.map(([heading, meetings]) => (
        <div key={heading}>
          <div style={dateHeadingStyle}>{heading}</div>
          {meetings.map((meeting) => {
            const isExpanded = expandedMeetingId === meeting.id;

            return (
              <div key={meeting.id} style={{ borderTop: "1px solid #eef3f8" }}>
                <div className="meetings-row">
                  <div className="meetings-row__time">
                    <span className="meetings-row__dot" />
                    <div>
                      <div className="meetings-row__time-text">
                        {format(new Date(meeting.start_time), "h:mm a")} - {format(new Date(meeting.end_time), "h:mm a")}
                      </div>
                      {showBuffers && hasBuffers(meeting) ? (
                        <div style={bufferSummaryStyle}>
                          Buffer block:{" "}
                          {format(
                            subMinutes(new Date(meeting.start_time), meeting.buffer_before_minutes || 0),
                            "h:mm a"
                          )}{" "}
                          -{" "}
                          {format(
                            addMinutes(new Date(meeting.end_time), meeting.buffer_after_minutes || 0),
                            "h:mm a"
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="meetings-row__details">
                    <p className="meetings-row__invitee">{meeting.invitee_name.toUpperCase()}</p>
                    <p className="meetings-row__event">
                      Event type <strong>{meeting.event_name}</strong>
                    </p>
                  </div>

                  <div className="meetings-row__hosts">1 host | 0 non-hosts</div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMeetingId((current) => (current === meeting.id ? null : meeting.id))
                    }
                    className="meetings-row__details-button"
                  >
                    <ChevronRight
                      size={16}
                      style={{
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.18s ease",
                      }}
                    />
                    Details
                  </button>
                </div>

                {isExpanded ? (
                  <MeetingExpandedRow
                    meeting={meeting}
                    showBuffers={showBuffers}
                    onCancel={onCancel}
                    setFilterPanelOpen={setFilterPanelOpen}
                    setQuery={setQuery}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ))}

      <div style={endOfListStyle}>You&apos;ve reached the end of the list</div>
    </div>
  );
}

function MeetingExpandedRow({
  meeting,
  showBuffers,
  onCancel,
  setFilterPanelOpen,
  setQuery,
}) {
  return (
    <div className="meetings-expanded-row">
      <div className="meetings-expanded-row__actions">
        <button
          type="button"
          onClick={() =>
            window.open(
              `${window.location.origin}/book/${meeting.host_username}/${meeting.event_slug}/reschedule/${meeting.id}`,
              "_blank"
            )
          }
          style={detailActionPillStyle}
        >
          <RotateCcw size={16} />
          Reschedule
        </button>
        <button type="button" onClick={() => onCancel(meeting.id)} style={detailActionPillStyle}>
          <Trash2 size={16} />
          Cancel
        </button>
        <button type="button" onClick={() => (window.location.href = "/event-types")} style={detailLinkStyle}>
          Edit Event Type
        </button>
        <button
          type="button"
          onClick={() => {
            setFilterPanelOpen(true);
            setQuery((current) => ({ ...current, eventTypeIds: [meeting.event_type_id] }));
          }}
          style={detailLinkStyle}
        >
          Filter by Event Type
        </button>
        <button
          type="button"
          onClick={() =>
            window.open(`${window.location.origin}/book/${meeting.host_username}/${meeting.event_slug}`, "_blank")
          }
          style={detailLinkStyle}
        >
          Schedule Invitee Again
        </button>
        <button type="button" style={detailLinkStyle}>
          Report this event
        </button>
      </div>

      <div className="meetings-expanded-row__content">
        <DetailBlock title="Invitee">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={inviteeBadgeStyle}>{meeting.invitee_name.slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>{meeting.invitee_name}</div>
              <div style={{ fontSize: "14px", color: "#45607f" }}>{meeting.invitee_email}</div>
            </div>
          </div>
        </DetailBlock>

        <DetailBlock title="Location">This is a {meeting.location_type} web conference.</DetailBlock>
        {showBuffers && hasBuffers(meeting) ? (
          <DetailBlock title="Buffers">
            {meeting.buffer_before_minutes ? `${meeting.buffer_before_minutes} min before` : "0 min before"}
            {" • "}
            {meeting.buffer_after_minutes ? `${meeting.buffer_after_minutes} min after` : "0 min after"}
            <div style={{ marginTop: "8px", color: "#45607f" }}>
              Protected time:{" "}
              {format(
                subMinutes(new Date(meeting.start_time), meeting.buffer_before_minutes || 0),
                "h:mm a"
              )}{" "}
              -{" "}
              {format(
                addMinutes(new Date(meeting.end_time), meeting.buffer_after_minutes || 0),
                "h:mm a"
              )}
            </div>
          </DetailBlock>
        ) : null}
        <DetailBlock title="Invitee time zone">{meeting.invitee_timezone || "Not provided"}</DetailBlock>
        <DetailBlock title="Meeting host">{meeting.host_name} will attend this meeting</DetailBlock>
        {meeting.invitee_notes ? <DetailBlock title="Meeting notes">{meeting.invitee_notes}</DetailBlock> : null}
        {meeting.custom_question_answer ? (
          <DetailBlock title="Custom response">{meeting.custom_question_answer}</DetailBlock>
        ) : null}
        <div style={{ fontSize: "14px", color: "#6b7c93" }}>
          Created {format(new Date(meeting.created_at), "d MMMM yyyy")} by {meeting.host_name}
        </div>
      </div>
    </div>
  );
}

function hasBuffers(meeting) {
  return Boolean(
    (meeting.buffer_before_minutes || 0) > 0 || (meeting.buffer_after_minutes || 0) > 0
  );
}

function MultiSelectPopover({
  options,
  selectedValues,
  getValue,
  getLabel,
  onToggle,
  onCancel,
  onApply,
}) {
  return (
    <div style={popoverStyle(360)}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "#6b7c93" }}>
        <Search size={16} />
        <span style={{ fontSize: "14px" }}>Filter</span>
      </div>
      <div style={{ marginBottom: "14px", fontSize: "13px", color: "#006BFF" }}>select all / clear</div>
      <div style={{ display: "grid", gap: "10px", maxHeight: "200px", overflowY: "auto" }}>
        {options.length ? (
          options.map((option) => {
            const value = getValue(option);
            return (
              <label
                key={value}
                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", color: "#0f294d" }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(value)}
                  onChange={() => onToggle(value)}
                  style={{ width: "18px", height: "18px", accentColor: "#006BFF" }}
                />
                {getLabel(option)}
              </label>
            );
          })
        ) : (
          <div style={{ fontSize: "14px", color: "#6b7c93" }}>No options available.</div>
        )}
      </div>
      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "18px" }}>
        <button type="button" onClick={onCancel} style={secondaryPillStyle}>
          Cancel
        </button>
        <button type="button" onClick={onApply} style={primaryPillStyle}>
          Apply
        </button>
      </div>
    </div>
  );
}

function FilterCell({ label, children }) {
  return (
    <div>
      <div style={{ marginBottom: "8px", fontSize: "13px", color: "#6b7c93", fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}

function DetailBlock({ title, children }) {
  return (
    <div>
      <div style={{ marginBottom: "8px", fontSize: "13px", fontWeight: 700, color: "#0f294d", textTransform: "uppercase" }}>
        {title}
      </div>
      <div style={{ fontSize: "14px", color: "#0f294d", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: "40px",
        height: "24px",
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
          width: "18px",
          height: "18px",
          borderRadius: "999px",
          backgroundColor: "#FFFFFF",
          transform: checked ? "translateX(16px)" : "translateX(0)",
          transition: "transform 0.18s ease",
        }}
      />
    </button>
  );
}

function EmptyMeetingsState() {
  return (
    <div style={emptyStateStyle}>
      <div style={{ position: "relative", display: "inline-block", marginBottom: "18px" }}>
        <CalendarDays size={62} color="#B6C4D4" strokeWidth={1.4} />
        <div style={emptyBadgeStyle}>0</div>
      </div>
      <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#4B6B93" }}>No Events Yet</h3>
      <p style={{ margin: "0 0 18px", fontSize: "14px", color: "#6b7c93" }}>
        Share Event Type links to schedule events.
      </p>
      <a href="/event-types" style={emptyPrimaryLinkStyle}>
        View Event Types
      </a>
    </div>
  );
}

const helpBadgeStyle = {
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  border: "1px solid #0f294d",
  color: "#0f294d",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 700,
};

const dropdownButtonStyle = {
  height: "42px",
  borderRadius: "10px",
  border: "1px solid #AFC1D9",
  backgroundColor: "#FFFFFF",
  color: "#0f294d",
  padding: "0 14px",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
};

const cardStyle = {
  border: "1px solid #dbe4f0",
  borderRadius: "12px",
  backgroundColor: "#FFFFFF",
  overflow: "visible",
  maxWidth: "1350px",
};

const tabButtonStyle = (active) => ({
  background: "none",
  border: "none",
  borderBottom: active ? "3px solid #006BFF" : "3px solid transparent",
  color: "#0f294d",
  fontWeight: active ? 700 : 500,
  fontSize: "16px",
  padding: "16px 2px 14px",
  marginBottom: "-1px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
});

const roundedActionStyle = {
  height: "38px",
  borderRadius: "999px",
  border: "1px solid #7c95b1",
  backgroundColor: "#FFFFFF",
  color: "#0f294d",
  padding: "0 14px",
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const filterSelectButtonStyle = {
  width: "100%",
  height: "40px",
  borderRadius: "10px",
  border: "1px solid #dbe4f0",
  backgroundColor: "#FFFFFF",
  color: "#006BFF",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const dateHeadingStyle = {
  padding: "18px 28px",
  fontSize: "15px",
  color: "#0f294d",
  borderTop: "1px solid #eef3f8",
};

const detailActionPillStyle = {
  height: "40px",
  borderRadius: "999px",
  border: "1px solid #7c95b1",
  backgroundColor: "#FFFFFF",
  color: "#0f294d",
  padding: "0 18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const detailLinkStyle = {
  border: "none",
  background: "none",
  color: "#006BFF",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  padding: 0,
  textAlign: "left",
};

const inviteeBadgeStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "999px",
  backgroundColor: "#EEF4FB",
  color: "#0f294d",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 700,
};

const bufferSummaryStyle = {
  marginTop: "4px",
  fontSize: "13px",
  color: "#6b7c93",
};

const endOfListStyle = {
  padding: "18px 28px",
  textAlign: "center",
  fontSize: "14px",
  color: "#6b7c93",
  borderTop: "1px solid #eef3f8",
};

const emptyStateStyle = {
  padding: "64px 24px",
  textAlign: "center",
  minHeight: "360px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const emptyBadgeStyle = {
  position: "absolute",
  top: "-8px",
  right: "-10px",
  width: "24px",
  height: "24px",
  borderRadius: "999px",
  backgroundColor: "#7B8798",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const emptyPrimaryLinkStyle = {
  display: "inline-block",
  backgroundColor: "#006BFF",
  color: "#FFFFFF",
  borderRadius: "999px",
  padding: "10px 18px",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
};

const primaryPillStyle = {
  height: "42px",
  borderRadius: "999px",
  border: "none",
  backgroundColor: "#006BFF",
  color: "#FFFFFF",
  padding: "0 20px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryPillStyle = {
  height: "42px",
  borderRadius: "999px",
  border: "1px solid #7c95b1",
  backgroundColor: "#FFFFFF",
  color: "#0f294d",
  padding: "0 20px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const presetButtonStyle = {
  border: "none",
  background: "none",
  color: "#006BFF",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};

const popoverStyle = (width) => ({
  position: "absolute",
  top: "calc(100% + 10px)",
  left: 0,
  width: `min(${width}px, calc(100vw - 40px))`,
  borderRadius: "14px",
  backgroundColor: "#FFFFFF",
  border: "1px solid #dbe4f0",
  boxShadow: "0 18px 34px rgba(15, 41, 77, 0.12)",
  padding: "18px",
  zIndex: 25,
});
