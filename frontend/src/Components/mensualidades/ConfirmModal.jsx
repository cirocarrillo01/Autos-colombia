// frontend/src/Components/mensualidades/ConfirmModal.jsx
// Modal de confirmación reutilizable (reemplaza window.confirm)
import React, { useState } from "react";
import "./Mensualidades.css";

export default function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  onConfirmar,
  onCancelar,
  textoConfirmar = "Aceptar",
  textoCancelar = "Cancelar",
  tipo = "danger", // "danger" | "warning"
  requerirClave = false, // Si true, pide contraseña antes de confirmar
}) {
  const [clave, setClave] = useState("");
  const [errorClave, setErrorClave] = useState("");

  if (!abierto) return null;

  const manejarConfirmar = () => {
    if (requerirClave && !clave.trim()) {
      setErrorClave("La contraseña es obligatoria");
      return;
    }
    onConfirmar(requerirClave ? { clave } : undefined);
  };

  return (
    <div className="mn-modal-bg" onClick={onCancelar}>
      <div
        className={`mn-modal mn-modal--confirm mn-modal--${tipo}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h3 id="confirm-title">{titulo}</h3>
        <p>{mensaje}</p>
        {requerirClave && (
          <div className="mn-modal-clave">
            <input
              type="password"
              placeholder="Contraseña para confirmar"
              value={clave}
              onChange={(e) => { setClave(e.target.value); setErrorClave(""); }}
              onKeyDown={(e) => e.key === "Enter" && manejarConfirmar()}
              autoFocus
            />
            {errorClave && <span className="mn-error">{errorClave}</span>}
          </div>
        )}
        <div className="mn-modal-acciones">
          <button
            type="button"
            className={`mn-btn mn-btn--ghost ${tipo === "danger" ? "mn-btn--danger-text" : ""}`}
            onClick={() => { setClave(""); onCancelar(); }}
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            className={`mn-btn mn-btn--primary ${tipo === "danger" ? "mn-btn--danger" : ""}`}
            onClick={manejarConfirmar}
            autoFocus={!requerirClave}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}