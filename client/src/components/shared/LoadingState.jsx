export function LoadingState({ label = "Loading..." }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "160px",
        padding: "32px",
        fontSize: "14px",
        color: "#9ca3af",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            border: "2px solid #e5e7eb",
            borderTopColor: "#006BFF",
            animation: "spin 0.8s linear infinite",
          }}
        />
        {label}
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
