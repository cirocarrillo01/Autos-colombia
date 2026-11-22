// frontend/src/Components/mensualidades/MensualidadDetallePage.jsx
// Detalle por placa (RF06.5).
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { detallePorPlaca } from "../../api/mensualidadesApi.js";
import { apiError } from "../../api/client.js";
import { money, fecha, fechaHora } from "../../utils/formato.js";
import "./Mensualidades.css";

function InfoItem({ label, value }) {
  return (
    <div className="mn-info-item">
      <span className="mn-info-label">{label}</span>
      <span className="mn-info-value">{value || "—"}</span>
    </div>
  );
}

function estadoClass(estado) {
  switch (estado) {
    case "Al día": return "mn-badge--ok";
    case "Pendiente": return "mn-badge--warn";
    case "Sin mensualidad": return "mn-badge--neutral";
    default: return "mn-badge--info";
  }
}

export default function MensualidadDetallePage() {
  const { placa } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setErr("");
    detallePorPlaca(placa)
      .then((r) => vivo && setD(r))
      .catch((e) => vivo && setErr(apiError(e, "Error al cargar el detalle")))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [placa]);

  if (cargando)
    return <div style={{ padding: 24, color: "#6b7280" }}>Cargando…</div>;
  if (err)
    return (
      <div className="mn-page">
        <div className="mn-alert mn-alert--err">{err}</div>
        <Link to="/mensualidades" style={{ color: "#1d4ed8", textDecoration: "none" }}>← Volver a mensualidades</Link>
      </div>
    );
  if (!d) return <div className="mn-page" style={{ padding: 24 }}>Sin datos.</div>;

  const v = d.vehiculo;
  const pagos = d.historial_pagos ?? [];
  const mensualidades = d.historial_mensualidades ?? [];

  return (
    <div className="mn-page">
      <div style={{ marginBottom: 12 }}>
        <Link to="/mensualidades" style={{ color: "#1d4ed8", textDecoration: "none", fontSize: 14 }}>← Volver a mensualidades</Link>
      </div>

      <h1 style={{ marginTop: 0, marginBottom: 16 }}>{v.placa} — {v.propietario}</h1>

      <div className="mn-card">
        <fieldset className="mn-fieldset">
          <legend>Vehículo</legend>
          <InfoItem label="Tipo" value={v.tipo} />
          <InfoItem label="Documento" value={v.documento} />
          <InfoItem label="Color" value={v.color ?? "—"} />
          <InfoItem label="Modelo" value={v.modelo ?? "—"} />
          <InfoItem label="Tarifa mensual" value={money(v.tarifa_mensual)} />
          <InfoItem label="Estado" value={<span className={`mn-badge ${estadoClass(v.estado)}`}>{v.estado}</span>} />
        </fieldset>
      </div>

      <div className="mn-card">
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Mensualidad actual</h3>
        {d.mensualidad_actual ? (
          <div>
            Periodo: <strong>{fecha(d.mensualidad_actual.fecha_inicio)}</strong> → <strong>{fecha(d.mensualidad_actual.fecha_fin)}</strong> · Valor {money(d.mensualidad_actual.valor)} · Estado <span className={`mn-badge ${estadoClass(v.estado)}`}>{v.estado}</span>
          </div>
        ) : (
          <p style={{ color: "#6b7280", margin: 0 }}>Sin mensualidad activa.</p>
        )}
      </div>

      <div className="mn-card">
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Historial de pagos</h3>
        <div className="mn-historial-wrap">
          <table className="mn-historial">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Periodo</th>
                <th>Monto</th>
                <th>Recibido</th>
                <th>Método</th>
                <th>Operador</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 16, color: "#6b7280", textAlign: "center" }}>Sin pagos</td></tr>
              )}
              {pagos.map((p) => (
                <tr key={p.id_pago}>
                  <td>{fechaHora(p.fecha_pago)}</td>
                  <td>{fecha(p.periodo_inicio)} → {fecha(p.periodo_fin)}</td>
                  <td>{money(p.monto)}</td>
                  <td>{money(p.monto_recibido)}</td>
                  <td className="mn-cap">{p.metodo_pago}</td>
                  <td>{p.operador_nombres} {p.operador_apellidos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mn-card">
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Historial de mensualidades</h3>
        <div className="mn-historial-wrap">
          <table className="mn-historial">
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Estado</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {mensualidades.map((m) => (
                <tr key={m.id_mensualidad}>
                  <td>{fecha(m.fecha_inicio)}</td>
                  <td>{fecha(m.fecha_fin)}</td>
                  <td><span className={`mn-badge ${estadoClass(m.estado)}`}>{m.estado}</span></td>
                  <td>{money(m.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}