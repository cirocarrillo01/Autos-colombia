// backend/src/components/mensualidades/ResumenCards.jsx
// Tarjetas resumen por tipo (RF06.4).
import React from "react";

const CARD = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "16px 18px",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  minWidth: 260,
  flex: "1 1 260px",
};

function Stat({ label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
      }}
    >
      <span style={{ color: "#6b7280", fontSize: 13 }}>{label}</span>
      <strong style={{ color, fontSize: 14 }}>{value}</strong>
    </div>
  );
}

export default function ResumenCards({ resumen }) {
  if (!resumen?.length) return null;
  return (
    <div
      style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}
    >
      {resumen.map((r) => (
        <div key={r.tipo} style={CARD}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <h3 style={{ margin: 0, textTransform: "capitalize" }}>
              {r.tipo}s
            </h3>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Cupo {r.ocupados}/{r.capacidad}
            </span>
          </div>
          <Stat label="Al día" value={r.al_dia} color="#16a34a" />
          <Stat label="Pendiente" value={r.pendiente} color="#eab308" />
          <Stat
            label="Sin mensualidad"
            value={r.sin_mensualidad}
            color="#6b7280"
          />
        </div>
      ))}
    </div>
  );
}
