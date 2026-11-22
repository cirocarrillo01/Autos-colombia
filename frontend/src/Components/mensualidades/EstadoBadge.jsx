// backend/src/components/mensualidades/EstadoBadge.jsx
// Badge del estado derivado (RF06.1).
import React from "react";

const ESTILOS = {
  "Al día": { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
  Pendiente: { bg: "#fef9c3", fg: "#854d0e", dot: "#eab308" },
  "Sin mensualidad": { bg: "#e5e7eb", fg: "#374151", dot: "#9ca3af" },
};

export default function EstadoBadge({ estado }) {
  const e = ESTILOS[estado] ?? ESTILOS["Sin mensualidad"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: e.bg,
        color: e.fg,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: "50%", background: e.dot }}
      />
      {estado}
    </span>
  );
}
