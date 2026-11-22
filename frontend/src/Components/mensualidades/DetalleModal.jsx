// frontend/src/Components/mensualidades/DetalleModal.jsx
// Modal de detalle por placa (RF06.5).
import React, { useEffect, useState } from "react";
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

export default function DetalleModal({ placa, onClose }) {
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

  if (cargando) {
    return (
      <div className="mn-modal-bg" onClick={onClose}>
        <div className="mn-modal mn-modal--wide" onClick={(e) => e.stopPropagation()}>
          <h3>Detalle · {placa}</h3>
          <p style={{ color: "#6b7280" }}>Cargando…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mn-modal-bg" onClick={onClose}>
        <div className="mn-modal mn-modal--wide" onClick={(e) => e.stopPropagation()}>
          <h3>Detalle · {placa}</h3>
          <div className="mn-alert mn-alert--err">{err}</div>
          <div className="mn-modal-acciones">
            <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="mn-modal-bg" onClick={onClose}>
        <div className="mn-modal mn-modal--wide" onClick={(e) => e.stopPropagation()}>
          <h3>Detalle · {placa}</h3>
          <p style={{ color: "#6b7280" }}>Sin datos.</p>
          <div className="mn-modal-acciones">
            <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  const v = d.vehiculo;
  const pagos = d.historial_pagos ?? [];
  const mensualidades = d.historial_mensualidades ?? [];

  return (
    <div className="mn-modal-bg" onClick={onClose}>
      <div className="mn-modal mn-modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3>Detalle · {v.placa}</h3>

                <div className="mn-detail-section">Vehículo</div>
        <div className="mn-detail-card mn-detail-grid mn-detail-grid-4">
          <InfoItem label="Tipo" value={v.tipo} />
          <InfoItem label="Propietario" value={v.propietario ?? "—"} />
          <InfoItem label="Tipo Doc." value={v.tipo_documento ?? "CC"} />
          <InfoItem label="Documento" value={v.documento} />
          <InfoItem label="Teléfono" value={v.telefono ?? "—"} />
          <InfoItem label="Email" value={v.email ?? "—"} />
          <InfoItem label="Color" value={v.color ?? "—"} />
          <InfoItem label="Modelo" value={v.nombre_modelo ?? "—"} />
          <InfoItem label="Año" value={v.modelo ?? "—"} />
          <InfoItem label="Tarifa mensual" value={money(v.tarifa_mensual)} />
          <InfoItem label="Estado" value={<span className={`mn-badge ${estadoClass(v.estado)}`}>{v.estado}</span>} />
        </div>

        <div className="mn-detail-section">Mensualidad actual</div>
        <div className="mn-detail-card mn-detail-card--gray">
          {d.mensualidad_actual ? (
            <div className="mn-detail-row">
              <div><span className="mn-detail-label">PERIODO</span><strong className="mn-detail-value">{fecha(d.mensualidad_actual.fecha_inicio)} → {fecha(d.mensualidad_actual.fecha_fin)}</strong></div>
              <div><span className="mn-detail-label">ESTADO</span><span className={`mn-badge ${estadoClass(v.estado)}`}>{v.estado}</span></div>
              <div><span className="mn-detail-label">VALOR</span><strong className="mn-detail-value">{money(d.mensualidad_actual.valor)}</strong></div>
              <div><span className="mn-detail-label">CONFIRMÓ</span><strong className="mn-detail-value">{d.mensualidad_actual.confirmador}</strong></div>
            </div>
          ) : (
            <p style={{ color: "#6b7280", margin: 0 }}>Sin mensualidad activa.</p>
          )}
        </div>

        {d.proximo_periodo && (
          <>
            <div className="mn-detail-section">Próximo periodo (ya pagado)</div>
            <div className="mn-detail-card mn-detail-card--gray">
              {fecha(d.proximo_periodo.fecha_inicio)} → {fecha(d.proximo_periodo.fecha_fin)} · {money(d.proximo_periodo.valor)}
            </div>
          </>
        )}

        <div className="mn-detail-section">Historial de pagos</div>
        <div className="mn-historial-wrap" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6 }}>
          <table className="mn-historial">
            <thead>
              <tr><th>Fecha</th><th>Periodo</th><th>Monto</th><th>Confirmó</th></tr>
            </thead>
            <tbody>
              {pagos.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "#6b7280" }}>Sin pagos</td></tr>
              )}
              {pagos.map((p) => (
                <tr key={p.id_pago}>
                  <td>{fechaHora(p.fecha_pago)}</td>
                  <td>{fecha(p.periodo_inicio)} → {fecha(p.periodo_fin)}</td>
                  <td>{money(p.monto)}</td>
                  <td>{p.operador_nombres} {p.operador_apellidos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mn-detail-section">Historial de mensualidades</div>
        <div className="mn-historial-wrap" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6 }}>
          <table className="mn-historial">
            <thead>
              <tr><th>Inicio</th><th>Fin</th><th>Estado</th><th>Valor</th></tr>
            </thead>
            <tbody>
              {mensualidades.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "#6b7280" }}>Sin mensualidades</td></tr>
              )}
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

        <div className="mn-modal-acciones">
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}