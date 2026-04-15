import { useEffect, useState } from "react";
import { X } from "lucide-react";

const defaultFormState = {
  name: "",
  description: "",
  durationMinutes: 30,
  slug: "",
};

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];

export function EventTypeFormModal({ isOpen, mode, initialValue, onClose, onSubmit, loading }) {
  const [form, setForm] = useState(defaultFormState);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      initialValue
        ? {
            name: initialValue.name,
            description: initialValue.description || "",
            durationMinutes: initialValue.duration_minutes,
            slug: initialValue.slug,
          }
        : defaultFormState
    );
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((curr) => ({
      ...curr,
      [name]: name === "durationMinutes" ? Number(value) : value,
    }));
  }

  function handleNameBlur() {
    if (mode === "edit") return;
    const slug = form.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setForm((curr) => ({ ...curr, slug: curr.slug || slug }));
  }

  async function handleSave(e) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>
              {mode === "edit" ? "Edit event type" : "Create new event type"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#374151"; e.currentTarget.style.backgroundColor = "#f3f4f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Name */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                Event name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                onBlur={handleNameBlur}
                placeholder="30 Minute Meeting"
                required
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "0 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#1a1a1a",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#006BFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,107,255,0.1)"; }}
                onBlurCapture={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="A short description of this event type."
                rows={3}
                style={{
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
                }}
                onFocus={(e) => { e.target.style.borderColor = "#006BFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,107,255,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Duration + Slug row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                  Duration
                </label>
                <select
                  name="durationMinutes"
                  value={form.durationMinutes}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "#1a1a1a",
                    outline: "none",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                  URL slug <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="30-min-meeting"
                  required
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "#1a1a1a",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#006BFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,107,255,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid #f3f4f6",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 20px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "#fff",
                color: "#374151",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "8px 20px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: loading ? "#93c5fd" : "#006BFF",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Saving..." : mode === "edit" ? "Save changes" : "Create event type"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
