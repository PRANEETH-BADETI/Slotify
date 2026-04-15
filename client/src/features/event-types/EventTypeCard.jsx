import {
  Copy,
  ExternalLink,
  MoreVertical,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const BORDER_COLORS = ["#8247F5", "#0EA5E9", "#F59E0B", "#10B981", "#EF4444", "#006BFF"];

export function EventTypeCard({
  eventType,
  username,
  index = 0,
  checked,
  onToggleSelect,
  onOpen,
  onEdit,
  onDelete,
  onToggleActive,
}) {
  const publicLink = `${window.location.origin}/book/${username}/${eventType.slug}`;
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const borderColor = BORDER_COLORS[index % BORDER_COLORS.length];

  const summaryText = useMemo(
    () =>
      `${eventType.duration_minutes} min - ${eventType.location_type || "Google Meet"} - One-on-One`,
    [eventType.duration_minutes, eventType.location_type]
  );

  useEffect(() => {
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [menuOpen]);

  function stopEvent(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleCopy(event) {
    stopEvent(event);
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function handleCardKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(eventType);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(eventType)}
      onKeyDown={handleCardKeyDown}
      className={`event-type-card${checked ? " is-selected" : ""}`}
    >
      <div
        className="event-type-card__stripe"
        style={{ backgroundColor: borderColor }}
      />

      <div className="event-type-card__inner">
        <div className="event-type-card__main">
          <div className="event-type-card__checkbox">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                event.stopPropagation();
                onToggleSelect(eventType.id);
              }}
              onClick={(event) => event.stopPropagation()}
            />
          </div>

          <div className="event-type-card__content">
            <div className="event-type-card__title-row">
              <h3 className="event-type-card__title">{eventType.name}</h3>
              {!eventType.is_active ? (
                <span className="event-type-card__status">Off</span>
              ) : null}
            </div>

            <p className="event-type-card__summary">{summaryText}</p>
            <p className="event-type-card__schedule">Weekdays, 9 am - 5 pm</p>
          </div>
        </div>

        <div className="event-type-card__actions">
          <button
            type="button"
            onClick={handleCopy}
            className="event-type-card__copy-button"
          >
            <Copy size={16} />
            {copied ? "Copied!" : "Copy link"}
          </button>

          <button
            type="button"
            onClick={(event) => {
              stopEvent(event);
              window.open(publicLink, "_blank");
            }}
            className="event-type-card__icon-button"
          >
            <ExternalLink size={19} />
          </button>

          <div
            ref={menuRef}
            className="event-type-card__menu"
            onClick={stopEvent}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="event-type-card__icon-button"
            >
              <MoreVertical size={19} />
            </button>

            {menuOpen ? (
              <div className="event-type-card__menu-panel">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(eventType);
                  }}
                  className="event-type-card__menu-item"
                >
                  <Pencil size={15} />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleActive(eventType);
                  }}
                  className="event-type-card__menu-item"
                >
                  <Power size={15} />
                  {eventType.is_active ? "Turn off" : "Turn on"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(eventType.id);
                  }}
                  className="event-type-card__menu-item event-type-card__menu-item--danger"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
