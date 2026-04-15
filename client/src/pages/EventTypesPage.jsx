import {
  ChevronDown,
  Copy,
  Eye,
  ExternalLink,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  bulkUpdateEventTypes,
  createEventType,
  deleteEventType,
  getEventTypes,
  updateEventType,
} from "../api/admin";
import { LoadingState } from "../components/shared/LoadingState";
import { EventTypeCard } from "../features/event-types/EventTypeCard";
import { useAdminLayout } from "../hooks/useAdminLayout";

const drawerDefaults = {
  name: "New Meeting",
  description: "",
  durationMinutes: 30,
  slug: "",
  isActive: true,
  locationType: "Google Meet",
  bookingWindowDays: 60,
  minimumNoticeHours: 4,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  customQuestion: "",
};

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120];
const TOGGLE_OPTIONS = [
  { label: "Turn on", value: true },
  { label: "Turn off", value: false },
];

function mapEventTypeToForm(eventType) {
  if (!eventType) {
    return drawerDefaults;
  }

  return {
    name: eventType.name,
    description: eventType.description || "",
    durationMinutes: eventType.duration_minutes,
    slug: eventType.slug,
    isActive: eventType.is_active,
    locationType: eventType.location_type || "Google Meet",
    bookingWindowDays: eventType.booking_window_days || 60,
    minimumNoticeHours: eventType.minimum_notice_hours || 4,
    bufferBeforeMinutes: eventType.buffer_before_minutes || 0,
    bufferAfterMinutes: eventType.buffer_after_minutes || 0,
    customQuestion: eventType.custom_question || "",
  };
}

export function EventTypesPage() {
  const { profile, refreshProfile } = useAdminLayout();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toggleMenuOpen, setToggleMenuOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [activeEventTypeId, setActiveEventTypeId] = useState(null);
  const [drawerForm, setDrawerForm] = useState(drawerDefaults);
  const [drawerSections, setDrawerSections] = useState({
    duration: true,
    location: true,
    availability: true,
    description: true,
    limits: true,
    invitee: true,
  });
  const createMenuRef = useRef(null);

  async function loadEventTypes() {
    try {
      const nextData = await getEventTypes();
      setData(nextData);
      setError("");
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load event types.");
    }
  }

  useEffect(() => {
    loadEventTypes();
  }, []);

  const filteredItems = useMemo(() => {
    const items = data?.items || [];
    const term = search.trim().toLowerCase();

    if (!term) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(term));
  }, [data?.items, search]);

  const activeEventType = useMemo(
    () => data?.items?.find((item) => item.id === activeEventTypeId) || null,
    [activeEventTypeId, data?.items]
  );

  useEffect(() => {
    if (drawerMode === "edit" && activeEventType) {
      setDrawerForm(mapEventTypeToForm(activeEventType));
    }
  }, [activeEventType, drawerMode]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setCreateMenuOpen(false);
      }
    }

    if (createMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [createMenuOpen]);

  useEffect(() => {
    function handleStartCreate() {
      openCreateDrawer();
    }

    window.addEventListener("event-types:start-create", handleStartCreate);
    return () => {
      window.removeEventListener("event-types:start-create", handleStartCreate);
    };
  }, []);

  const fullName = profile?.user?.full_name || data?.fullName || "User";
  const initial = fullName.charAt(0).toUpperCase();
  const landingEvent = data?.items?.find((item) => item.is_active) || data?.items?.[0];

  function buildSlug(value) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function openCreateDrawer() {
    setCreateMenuOpen(false);
    setActiveEventTypeId(null);
    setDrawerMode("create");
    setDrawerForm({
      ...drawerDefaults,
      name: "New Meeting",
      slug: "",
    });
  }

  async function handleDrawerSave() {
    try {
      setIsSaving(true);
      const payload = {
        ...drawerForm,
        slug: drawerForm.slug || buildSlug(drawerForm.name),
      };

      if (drawerMode === "create") {
        const createdEventType = await createEventType(payload);
        setDrawerMode("edit");
        setActiveEventTypeId(createdEventType.id);
      } else if (activeEventType) {
        await updateEventType(activeEventType.id, payload);
      }

      await Promise.all([loadEventTypes(), refreshProfile()]);
      setError("");
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Failed to save event type.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(eventTypeId) {
    const confirmed = window.confirm("Delete this event type?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteEventType(eventTypeId);
      setSelectedIds((current) => current.filter((id) => id !== eventTypeId));
      if (activeEventTypeId === eventTypeId) {
        setActiveEventTypeId(null);
      }
      await Promise.all([loadEventTypes(), refreshProfile()]);
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Failed to delete event type.");
    }
  }

  async function handleQuickToggle(eventType) {
    try {
      await updateEventType(eventType.id, {
        ...mapEventTypeToForm(eventType),
        isActive: !eventType.is_active,
      });
      await loadEventTypes();
    } catch (toggleError) {
      setError(toggleError.response?.data?.message || "Failed to update event type.");
    }
  }

  async function handleBulkDelete() {
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected event type(s)?`);

    if (!confirmed) {
      return;
    }

    try {
      await bulkUpdateEventTypes({
        ids: selectedIds,
        action: "delete",
      });
      setSelectedIds([]);
      setActiveEventTypeId(null);
      await Promise.all([loadEventTypes(), refreshProfile()]);
    } catch (bulkError) {
      setError(bulkError.response?.data?.message || "Failed to update selected event types.");
    }
  }

  async function handleBulkToggle(isActive) {
    try {
      await bulkUpdateEventTypes({
        ids: selectedIds,
        action: "toggle",
        isActive,
      });
      setSelectedIds([]);
      setToggleMenuOpen(false);
      await loadEventTypes();
    } catch (bulkError) {
      setError(bulkError.response?.data?.message || "Failed to update selected event types.");
    }
  }

  function toggleSelection(eventTypeId) {
    setSelectedIds((current) =>
      current.includes(eventTypeId)
        ? current.filter((id) => id !== eventTypeId)
        : [...current, eventTypeId]
    );
  }

  function updateDrawerField(name, value) {
    setDrawerForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  const isDrawerOpen = drawerMode === "create" || Boolean(activeEventType);
  const drawerHeading = drawerForm.name || "New Meeting";
  const previewSlug = activeEventType?.slug;

  return (
    <div className="event-types-page">
      <section className="event-types-page__header">
        <div className="event-types-page__header-top">
          <div className="event-types-page__title-block">
            <div className="event-types-page__title-row">
              <h1 className="event-types-page__title">
              Scheduling
              </h1>
            
            </div>

            <div className="event-types-page__tabs">
              <button
                type="button"
                className="event-types-page__tab event-types-page__tab--active"
              >
              Event types
              </button>
            </div>
          </div>

        <div ref={createMenuRef} className="event-types-page__create-area">
          <button
            type="button"
            onClick={() => setCreateMenuOpen((current) => !current)}
            style={primaryPillStyle}
          >
            <Plus size={18} />
            Create
            <ChevronDown size={16} />
          </button>

          {createMenuOpen && (
            <div className="event-types-page__create-menu">
              <div className="text-[15px] font-bold text-[#0f294d] mb-4.5">
                Event Types
              </div>
              <button type="button" onClick={openCreateDrawer} style={createMenuItemStyle(false)}>
                <span style={createMenuTitleStyle}>One-on-one</span>
                <span style={createMenuMetaStyle}>1 host -&gt; 1 invitee</span>
                <span style={createMenuDescriptionStyle}>
                  Good for coffee chats, 1:1 interviews, and intro calls.
                </span>
              </button>
              
            </div>
          )}
        </div>
        </div>
      </section>

      <section className="event-types-page__content">
        <div className={`event-types-layout${isDrawerOpen ? " is-drawer-open" : ""}`}>
          <div className="event-types-layout__main">
            <div className="event-types-page__search">
              <Search size={18} className="event-types-page__search-icon" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search event types"
                className="event-types-page__search-input"
              />
            </div>

            {error && <p className="m-0 mb-3.5 text-red-600 text-[13px]">{error}</p>}
            {!data && !error && <LoadingState label="Loading event types..." />}

            {data && (
              <>
                <div className="event-types-page__owner-row">
                  <div className="event-types-page__owner-info">
                    <div style={avatarStyle}>{initial}</div>
                    <span className="text-sm font-semibold text-[#0f294d]">{fullName}</span>
                  </div>

                  {landingEvent && (
                    <button
                      type="button"
                      style={secondaryLinkButtonStyle}
                      onClick={() =>
                        window.open(`${window.location.origin}/book/${data.username}/${landingEvent.slug}`, "_blank")
                      }
                      className="event-types-page__landing-link"
                    >
                      <ExternalLink size={16} />
                      View landing page
                    </button>
                  ) || null}
                </div>

                {filteredItems.length ? (
                  <div className="flex flex-col gap-3.5 max-w-[1350px]">
                    {filteredItems.map((eventType, index) => (
                      <EventTypeCard
                        key={eventType.id}
                        eventType={eventType}
                        username={data.username}
                        index={index}
                        checked={selectedIds.includes(eventType.id)}
                        onToggleSelect={toggleSelection}
                        onOpen={(selectedEventType) => { setDrawerMode("edit"); setActiveEventTypeId(selectedEventType.id); }}
                        onEdit={(selectedEventType) => { setDrawerMode("edit"); setActiveEventTypeId(selectedEventType.id); }}
                        onDelete={handleDelete}
                        onToggleActive={handleQuickToggle}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border border-[#dbe4f0] rounded-[14px] bg-white p-16 text-center">
                    <h3 className="m-0 mb-2 text-[22px] font-bold text-[#0f294d]">No event types yet</h3>
                    <p className="m-0 mb-6 text-sm text-[#5b6b7f]">Create your first event type so invitees can start booking time.</p>
                    <button type="button" onClick={openCreateDrawer} className="h-11 rounded-full border-none bg-[#006BFF] text-white px-5 text-sm font-semibold cursor-pointer">
                      Create event type
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {isDrawerOpen && (
            <>
              <div
                className="event-types-drawer-backdrop"
                onClick={() => {
                  setActiveEventTypeId(null);
                  setDrawerMode(null);
                }}
              />
              
              <aside className="event-types-drawer">
                <div className="flex items-center justify-between p-[18px_20px] border-b border-[#dbe4f0]">
                  <div>
                    <p className="m-0 mb-1.5 text-sm font-semibold text-[#45607f]">Event type</p>
                    <div className="flex items-center gap-2.5">
                      <span className="w-4.5 h-4.5 rounded-full bg-[#8247F5] shrink-0" />
                      <div>
                        <h2 className="m-0 text-lg font-bold text-[#0f294d]">{drawerHeading}</h2>
                        <p className="m-0 mt-1 text-sm text-[#45607f]">One-on-One</p>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setActiveEventTypeId(null); setDrawerMode(null); }} style={iconPlainButtonStyle} className="p-2 cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-[18px_18px_0]">
                  <label className="block mb-2 text-xs font-bold text-[#45607f] uppercase">Event name</label>
                  <input value={drawerForm.name} onChange={(event) => updateDrawerField("name", event.target.value)} style={drawerInputStyle} placeholder="New Meeting" />
                </div>

                <DrawerSection title="Duration" open={drawerSections.duration} onToggle={() => setDrawerSections((current) => ({ ...current, duration: !current.duration }))}>
                  <select value={drawerForm.durationMinutes} onChange={(event) => updateDrawerField("durationMinutes", Number(event.target.value))} style={drawerInputStyle}>
                    {DURATION_OPTIONS.map((value) => <option key={value} value={value}>{value} min</option>)}
                  </select>
                </DrawerSection>

                <DrawerSection title="Location" open={drawerSections.location} onToggle={() => setDrawerSections((current) => ({ ...current, location: !current.location }))}>
                  <select value={drawerForm.locationType} onChange={(event) => updateDrawerField("locationType", event.target.value)} style={drawerInputStyle}>
                    <option value="Google Meet">Google Meet</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Phone call">Phone call</option>
                    <option value="In-person">In-person</option>
                  </select>
                </DrawerSection>

                <DrawerSection title="Availability" open={drawerSections.availability} onToggle={() => setDrawerSections((current) => ({ ...current, availability: !current.availability }))}>
                  <div className="grid gap-3.5">
                    <div>
                      <label className="block mb-2 text-xs font-bold text-[#45607f] uppercase">Date-range</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <NumberField label="Days into future" value={drawerForm.bookingWindowDays} onChange={(value) => updateDrawerField("bookingWindowDays", value)} />
                        <NumberField label="Hours notice" value={drawerForm.minimumNoticeHours} onChange={(value) => updateDrawerField("minimumNoticeHours", value)} />
                      </div>
                    </div>
                    <div className="border border-[#dbe4f0] rounded-xl p-3.5 text-[#45607f] text-sm leading-relaxed">
                      This event type uses the weekly and custom hours saved on the schedule.
                    </div>
                  </div>
                </DrawerSection>

                <DrawerSection title="Description" open={drawerSections.description} onToggle={() => setDrawerSections((current) => ({ ...current, description: !current.description }))}>
                  <textarea value={drawerForm.description} onChange={(event) => updateDrawerField("description", event.target.value)} rows={4} className="w-full min-h-[96px] pt-3 px-3.5 border border-[#dbe4f0] rounded-xl text-sm" placeholder="Tell your invitees what this meeting is about" />
                </DrawerSection>

                <DrawerSection title="Limits and buffers" open={drawerSections.limits} onToggle={() => setDrawerSections((current) => ({ ...current, limits: !current.limits }))}>
                  <div className="grid grid-cols-2 gap-2.5">
                    <NumberField label="Before" suffix="min" value={drawerForm.bufferBeforeMinutes} onChange={(value) => updateDrawerField("bufferBeforeMinutes", value)} />
                    <NumberField label="After" suffix="min" value={drawerForm.bufferAfterMinutes} onChange={(value) => updateDrawerField("bufferAfterMinutes", value)} />
                  </div>
                </DrawerSection>

                <DrawerSection title="Invitee form" open={drawerSections.invitee} onToggle={() => setDrawerSections((current) => ({ ...current, invitee: !current.invitee }))}>
                  <input value={drawerForm.customQuestion} onChange={(event) => updateDrawerField("customQuestion", event.target.value)} placeholder="Add an optional custom question" style={drawerInputStyle} />
                </DrawerSection>

                <div className="sticky bottom-0 border-t border-[#dbe4f0] p-[14px_18px] flex items-center justify-between gap-3 bg-white">
                  <button type="button" onClick={() => previewSlug && window.open(`${window.location.origin}/book/${data.username}/${previewSlug}`, "_blank")} disabled={!previewSlug} style={footerPlainButtonStyle}>
                    <Eye size={16} />
                    Preview
                  </button>
                  <span className="hidden sm:inline text-sm text-[#0f294d] font-medium">More options</span>
                  <button type="button" onClick={handleDrawerSave} disabled={isSaving} className={`h-11 rounded-full border-none px-5 text-sm font-semibold cursor-pointer ${isSaving ? "bg-[#8ab8ff] cursor-not-allowed" : "bg-[#006BFF] text-white"}`}>
                    {isSaving ? "Saving..." : drawerMode === "create" ? "Create" : "Save changes"}
                  </button>
                </div>
              </aside>
            </>
          )}
        </div>
      </section>

      {selectedIds.length ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "18px",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #dbe4f0",
            borderRadius: "14px",
            padding: "10px 14px",
            boxShadow: "0 18px 42px rgba(15, 41, 77, 0.16)",
            zIndex: 40,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              color: "#45607f",
            }}
          >
            <span style={selectedCountStyle}>{selectedIds.length}</span>
            selected
          </span>

          <button type="button" onClick={handleBulkDelete} style={bulkActionButtonStyle}>
            Delete
          </button>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setToggleMenuOpen((current) => !current)}
              style={bulkActionButtonStyle}
            >
              Toggle on/off
              <ChevronDown size={15} />
            </button>

            {toggleMenuOpen ? (
              <div
                style={{
                  position: "absolute",
                  bottom: "52px",
                  left: 0,
                  width: "168px",
                  borderRadius: "12px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #dbe4f0",
                  boxShadow: "0 18px 34px rgba(15, 41, 77, 0.12)",
                  overflow: "hidden",
                }}
              >
                {TOGGLE_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleBulkToggle(option.value)}
                    style={menuActionStyle}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button type="button" disabled style={disabledBulkButtonStyle}>
            <Copy size={15} />
            Copy availability from
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedIds([]);
              setToggleMenuOpen(false);
            }}
            style={iconPlainButtonStyle}
          >
            <X size={18} />
          </button>
        </div>
      ) : null}

    </div>
  );
}

function DrawerSection({ title, open, onToggle, children }) {
  return (
    <section style={{ borderBottom: "1px solid #dbe4f0" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f294d" }}>{title}</span>
        <ChevronDown
          size={18}
          color="#0f294d"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "0.18s ease" }}
        />
      </button>

      {open ? <div style={{ padding: "0 18px 18px" }}>{children}</div> : null}
    </section>
  );
}

function NumberField({ label, suffix, value, onChange }) {
  return (
    <div>
      <label style={drawerLabelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ ...drawerInputStyle, paddingRight: suffix ? "54px" : "14px" }}
        />
        {suffix ? (
          <span
            style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "13px",
              color: "#5b6b7f",
            }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
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

const primaryPillStyle = {
  height: "46px",
  borderRadius: "999px",
  border: "none",
  backgroundColor: "#006BFF",
  color: "#FFFFFF",
  padding: "0 22px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryLinkButtonStyle = {
  background: "none",
  border: "none",
  color: "#006BFF",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
};

const avatarStyle = {
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  backgroundColor: "#EEF4FB",
  color: "#0f294d",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "15px",
  fontWeight: 600,
};

const iconPlainButtonStyle = {
  border: "none",
  background: "none",
  color: "#45607f",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 4,
};

const drawerInputStyle = {
  width: "100%",
  minHeight: "44px",
  borderRadius: "12px",
  border: "1px solid #dbe4f0",
  padding: "0 14px",
  fontSize: "14px",
  color: "#0f294d",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const drawerLabelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#45607f",
};

const footerPlainButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "none",
  border: "none",
  color: "#0f294d",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
};

const selectedCountStyle = {
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  backgroundColor: "#EEF4FB",
  color: "#0f294d",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 700,
};

const bulkActionButtonStyle = {
  height: "40px",
  borderRadius: "999px",
  border: "1px solid #7c95b1",
  backgroundColor: "#FFFFFF",
  color: "#0f294d",
  padding: "0 16px",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const disabledBulkButtonStyle = {
  ...bulkActionButtonStyle,
  color: "#A6B5C6",
  borderColor: "#D7E1ED",
  backgroundColor: "#F4F8FC",
  cursor: "not-allowed",
};

const menuActionStyle = {
  width: "100%",
  height: "42px",
  border: "none",
  background: "none",
  color: "#0f294d",
  fontSize: "14px",
  fontWeight: 500,
  padding: "0 14px",
  textAlign: "left",
  cursor: "pointer",
};

function createMenuItemStyle(disabled) {
  return {
    width: "100%",
    border: "none",
    background: "none",
    padding: 0,
    display: "grid",
    gap: "4px",
    textAlign: "left",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.52 : 1,
    marginBottom: "18px",
  };
}

const createMenuTitleStyle = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#006BFF",
};

const createMenuMetaStyle = {
  fontSize: "15px",
  color: "#0f294d",
};

const createMenuDescriptionStyle = {
  fontSize: "14px",
  color: "#6b7c93",
  lineHeight: 1.45,
};
