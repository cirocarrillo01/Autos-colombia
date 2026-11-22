// frontend/src/Components/mensualidades/PagoModal.jsx
// Confirmación de pago recibido (el cobro se hace por fuera de la app).
import React, { useEffect, useState } from "react";
import {
  previsualizarPago,
  registrarPago,
} from "../../api/mensualidadesApi.js";
import { apiError } from "../../api/client.js";
import { money, fecha } from "../../utils/formato.js";
import "./Mensualidades.css";

export default function PagoModal({ placa, onClose, onExito }) {
  const [prev, setPrev] = useState(null);
  const [recibido, setRecibido] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    previsualizarPago(placa)
      .then((r) => vivo && setPrev(r))
      .catch(
        (e) =>
          vivo && setError(apiError(e, "No se pudo previsualizar el pago")),
      )
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [placa]);

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando || !recibido) return;
    setError("");
    setEnviando(true);
    try {
      const r = await registrarPago({ placa });
      onExito?.(r.pago);
      onClose();
    } catch (err) {
      setError(apiError(err, "Error al confirmar el pago"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mn-modal-bg" onClick={onClose}>
      <div
        className="mn-modal"
        style={{ width: "min(520px, 92vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Confirmar pago — {placa}</h3>

        {cargando && <p style={{ color: "#6b7280" }}>Calculando periodo…</p>}

        {!cargando && prev && (
          <>
            <div className="mn-field mn-field--full">
              <span className="mn-info-label">Propietario</span>
              <span className="mn-info-value">{prev.propietario ?? "—"}</span>
            </div>

            <fieldset className="mn-fieldset">
              <legend>Periodo a confirmar</legend>
              <InfoItem
                label="Periodo"
                value={`${fecha(prev.periodo.inicio)} → ${fecha(prev.periodo.fin)}`}
              />
              <InfoItem
                label="Valor de la mensualidad"
                value={money(prev.valor)}
              />
            </fieldset>

            {prev.es_renovacion && prev.puede_pagar && (
              <div
                className="mn-alert mn-alert--warn"
                style={{ marginBottom: 10 }}
              >
                Renovación anticipada: el nuevo periodo inicia al terminar el
                actual.
              </div>
            )}

            {!prev.puede_pagar && prev.motivo_bloqueo && (
              <div
                className="mn-alert mn-alert--err"
                style={{ marginBottom: 10 }}
              >
                {prev.motivo_bloqueo}
              </div>
            )}

            <form onSubmit={enviar}>
              {prev.puede_pagar && (
                <label
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 10,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={recibido}
                    onChange={(e) => setRecibido(e.target.checked)}
                  />
                  Confirmo que el pago de {money(prev.valor)} fue recibido por
                  fuera de la aplicación
                </label>
              )}

              {error && (
                <div
                  className="mn-alert mn-alert--err"
                  style={{ marginTop: 10 }}
                >
                  {error}
                </div>
              )}

              <div className="mn-modal-acciones">
                <button
                  type="button"
                  className="mn-btn mn-btn--ghost"
                  disabled={enviando}
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="mn-btn mn-btn--primary"
                  disabled={enviando || !prev.puede_pagar || !recibido}
                >
                  {enviando ? "Confirmando…" : "Confirmar pago"}
                </button>
              </div>
            </form>
          </>
        )}

        {!cargando && !prev && error && (
          <div className="mn-alert mn-alert--err">{error}</div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="mn-info-item">
      <span className="mn-info-label">{label}</span>
      <span className="mn-info-value">{value}</span>
    </div>
  );
}
