// backend/src/components/mensualidades/FiltrosMensualidad.jsx
// Barra de filtros (RF06.3): q, estado, tipo, paginación.
import React from "react";

const input = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  background: "#fff",
};

import "./Mensualidades.css";

export default function FiltrosMensualidad({
  filtros,
  onChange,
  onSubmit,
  onLimpiar,
}) {
  const set = (k) => (e) => onChange({ ...filtros, [k]: e.target.value });
  return (
    <form
      className="mn-filtros"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
    >
      <input
        className="mn-field"
        style={{ flex: "2 1 300px", padding: "8px 12px" }}
        placeholder="Buscar por placa o documento"
        value={filtros.q}
        onChange={set("q")}
      />
      <select style={{ flex: "1 1 150px" }} value={filtros.estado} onChange={set("estado")}>
        <option value="">Todos los estados</option>
        <option value="Al día">Al día</option>
        <option value="Pendiente">Pendiente</option>
        <option value="Sin mensualidad">Sin mensualidad</option>
      </select>
      <select style={{ flex: "1 1 150px" }} value={filtros.tipo} onChange={set("tipo")}>
        <option value="">Todos los tipos</option>
        <option value="carro">Carros</option>
        <option value="moto">Motos</option>
      </select>
      <button type="submit" className="mn-btn mn-btn--primary">Buscar</button>
      <button type="button" className="mn-btn mn-btn--ghost" onClick={onLimpiar}>Limpiar</button>
    </form>
  );
}
