import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Link2,
  Menu,
  Plus,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { getAdminProfile } from "../../api/admin";
import { LoadingState } from "../shared/LoadingState";

const navigation = [
  { to: "/event-types", label: "Scheduling", icon: Link2 },
  { to: "/meetings", label: "Meetings", icon: CalendarDays },
  { to: "/availability", label: "Availability", icon: Clock3 },
];

function CalendlyLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export function AdminLayout() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sidebarCreateOpen, setSidebarCreateOpen] = useState(false);
  const sidebarCreateRef = useRef(null);
  const location = useLocation();
  const isSchedulingRoute =
    location.pathname === "/" || location.pathname.startsWith("/event-types");
  const sidebarWidth = collapsed ? 76 : 276;

  const loadProfile = useCallback(async () => {
    try {
      const nextProfile = await getAdminProfile();
      setProfile(nextProfile);
      setError("");
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load profile.");
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (sidebarCreateRef.current && !sidebarCreateRef.current.contains(event.target)) {
        setSidebarCreateOpen(false);
      }
    }

    if (sidebarCreateOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [sidebarCreateOpen]);

  useEffect(() => {
    setSidebarCreateOpen(false);
    setIsMobileOpen(false);
  }, [location.pathname]);

  function openCreateDrawer() {
    window.dispatchEvent(
      new CustomEvent("event-types:start-create", {
        detail: { kind: "one-on-one" },
      })
    );
    setSidebarCreateOpen(false);
    setIsMobileOpen(false);
  }

  const outletContext = useMemo(
    () => ({
      profile,
      refreshProfile: loadProfile,
    }),
    [loadProfile, profile]
  );

  const fullName = profile?.user?.full_name || "User";
  const initial = fullName.charAt(0).toUpperCase();

  if (!profile && !error) {
    return (
      <div className="admin-layout__loading">
        <LoadingState label="Loading workspace..." />
      </div>
    );
  }

  if (!profile && error) {
    return (
      <div className="admin-layout__loading">
        <LoadingState label={error} />
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {isMobileOpen ? (
        <div className="admin-layout__backdrop" onClick={() => setIsMobileOpen(false)} />
      ) : null}

      <aside
        className={`admin-layout__sidebar${collapsed ? " is-collapsed" : ""}${isMobileOpen ? " is-mobile-open" : ""}`}
        style={{ width: sidebarWidth }}
      >
        <div className="admin-layout__sidebar-top">
          {!collapsed ? (
            <Link to="/event-types" className="admin-layout__logo-link">
              <CalendlyLogo />
              <span className="admin-layout__logo-text">Slotify</span>
            </Link>
          ) : (
            <CalendlyLogo />
          )}

          <div className="admin-layout__sidebar-actions">
            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              className="admin-layout__desktop-toggle"
            >
              {!collapsed ? (
                <>
                  <ChevronLeft size={18} />
                  <ChevronLeft size={18} style={{ marginLeft: -8 }} />
                </>
              ) : (
                <>
                <ChevronRight size={18} />
                <ChevronRight size={18} style={{ marginLeft: -8 }} />
                </>
                
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="admin-layout__mobile-close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div ref={sidebarCreateRef} className="admin-layout__create-area">
          <button
            type="button"
            onClick={() => {
              if (!isSchedulingRoute) {
                window.location.href = "/event-types";
                return;
              }

              setSidebarCreateOpen((current) => !current);
            }}
            className="admin-layout__create-button"
          >
            <Plus size={18} />
            {!collapsed ? "Create" : null}
          </button>

          {!collapsed && sidebarCreateOpen && isSchedulingRoute ? (
            <div className="admin-layout__create-menu">
              <div className="admin-layout__create-menu-title">Event Types</div>

              <button type="button" onClick={openCreateDrawer} style={createOptionStyle(false)}>
                <span style={createOptionTitleStyle}>One-on-one</span>
                <span style={createOptionMetaStyle}>1 host to 1 invitee</span>
                <span style={createOptionDescriptionStyle}>
                  Good for coffee chats, 1:1 interviews, and intro calls.
                </span>
              </button>

              
            </div>
          ) : null}
        </div>

        <nav className="admin-layout__nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/event-types"
                ? location.pathname === "/" || location.pathname.startsWith("/event-types")
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`admin-layout__nav-link${isActive ? " is-active" : ""}${collapsed ? " is-collapsed" : ""}`}
              >
                <Icon size={19} />
                {!collapsed ? item.label : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-layout__footer-copy">
          
        </div>
      </aside>

      <div
        className={`admin-layout__content${collapsed ? " is-collapsed" : ""}`}
        style={{ marginLeft: sidebarWidth }}
      >
        <header className="admin-layout__header">
          <div className="admin-layout__header-left">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="admin-layout__mobile-menu"
            >
              <Menu size={22} />
            </button>

            
          </div>

          <div className="admin-layout__header-right">
            <button type="button" className="admin-layout__icon-button">
              <UserPlus size={20} />
            </button>
            <div className="admin-layout__avatar">{initial}</div>
            <ChevronDown size={16} color="#0f294d" />
          </div>
        </header>

        <main>
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}

function createOptionStyle(disabled) {
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

const createOptionTitleStyle = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#006BFF",
};

const createOptionMetaStyle = {
  fontSize: "15px",
  color: "#0f294d",
};

const createOptionDescriptionStyle = {
  fontSize: "14px",
  color: "#6b7c93",
  lineHeight: 1.45,
};
