// frontend/src/Components/mensualidades/TablaMensualidades.jsx
// Tabla de mensualidades (RF06.3, RF06.6).
import React from "react";
import { fecha, money, diasTexto } from "../../utils/formato.js";
import "./Mensualidades.css";

function estadoClass(estado) {
  switch (estado) {
    case "Al día": return "mn-badge--ok";
    case "Pendiente": return "mn-badge--warn";
    case "Sin mensualidad": return "mn-badge--neutral";
    default: return "mn-badge--info";
  }
}

export default function TablaMensualidades({
  rows,
  puedeEscribir,
  onPagar,
  onCancelar,
  onDetalle,
  onEditar,
  onEliminar,
}) {
  return (
    <div className="mn-tabla-wrap">
      <table className="mn-tabla">
        <thead>
          <tr>
            <th>Placa</th>
            <th>Propietario</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Vence</th>
            <th>Valor</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="mn-vacio">Sin resultados</td>
            </tr>
          )}
          {rows.map((r) => {
            const puedeCancelar = puedeEscribir && !r.dentro && r.estado !== "Sin mensualidad";
            const puedeEliminar = puedeEscribir && !r.dentro && r.estado === "Sin mensualidad";
            const motivo = r.sin_cupo ? "No hay cupo disponible"
              : r.siguiente_pagado ? "El siguiente periodo ya está pagado"
              : !r.puede_pagar ? "Aún no se puede renovar"
              : "Registrar pago";
            return (
              <tr key={r.id_vehiculo} style={{ background: r.dentro ? "#f8fafc" : "#fff" }}>
                <td style={{ fontWeight: 700 }}>
                  {r.placa}
                  {r.dentro && <span className="mn-tag-dentro">DENTRO</span>}
                </td>
                <td>{r.propietario}</td>
                <td className="mn-cap">{r.tipo}</td>
                <td><span className={`mn-badge ${estadoClass(r.estado)}`}>{r.estado}</span></td>
                <td>
                  {fecha(r.fecha_vencimiento)}
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{diasTexto(r.dias_para_vencer)}</div>
                </td>
                <td>{money(r.valor)}</td>
                <td>
                  <div className="mn-acciones">
                    <button
                      onClick={() => onDetalle?.(r)}
                      className="mn-icon-btn"
                      title="Ver detalle"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                    <button
                      onClick={() => onEditar?.(r)}
                      className="mn-icon-btn"
                      title="Editar"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button
                      onClick={() => onPagar(r)}
                      disabled={!puedeEscribir || !r.puede_pagar}
                      className="mn-btn mn-btn--primary"
                      style={{ padding: "5px 10px", fontSize: 12 }}
                      title={motivo}
                    >
                      Registrar pago
                    </button>
                    {puedeCancelar && (
                      <button
                        onClick={() => onCancelar(r)}
                        className="mn-btn mn-btn--ghost"
                        style={{ fontSize: 12 }}
                      >
                        Cancelar mensualidad
                      </button>
                    )}
                    {puedeEliminar && (
                      <button
                        onClick={() => onEliminar(r)}
                        className="mn-icon-btn mn-icon-btn--danger"
                        title="Eliminar vehículo"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
