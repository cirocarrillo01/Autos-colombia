// frontend/src/Components/mensualidades/RegistroVehiculoModal.jsx
import React, { useState, useEffect } from "react";
import { crearVehiculo, actualizarVehiculo } from "../../api/mensualidadesApi";
import { listarTiposVehiculo } from "../../services/api";
import { validarPlaca } from "../../validators/placa";
import { apiError } from "../../api/client";
import "./Mensualidades.css";

export default function RegistroVehiculoModal({
  onClose,
  onExito,
  vehiculoEdicion = null,
}) {
  const [tipos, setTipos] = useState([]);
  const initialForm = vehiculoEdicion
    ? {
        ...vehiculoEdicion,
        id_tipo_vehiculo: String(vehiculoEdicion.id_tipo_vehiculo),
        propietario_telefono: vehiculoEdicion.propietario_telefono ?? "",
        propietario_email: vehiculoEdicion.propietario_email ?? "",
      }
    : {
        placa: "",
        id_tipo_vehiculo: "1",
        color: "",
        modelo: "",
        nombre_modelo: "",
        propietario_nombre: "",
        propietario_tipo_documento: "cc",
        propietario_documento: "",
        propietario_telefono: "",
        propietario_email: "",
      };
  const [form, setForm] = useState(initialForm);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listarTiposVehiculo()
      .then((res) => {
        const data = res?.data ?? res;
        setTipos(Array.isArray(data) ? data : []);
      })
      .catch(() => setTipos([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.placa.trim()) {
      setError("La placa es obligatoria.");
      return;
    }
    if (!form.propietario_nombre.trim()) {
      setError("El nombre del propietario es obligatorio.");
      return;
    }
    if (!form.propietario_documento.trim()) {
      setError("El documento del propietario es obligatorio.");
      return;
    }
    const anio = Number(form.modelo);
    const anioActual = new Date().getFullYear();
    if (!anio || anio < 1930 || anio > anioActual) {
      setError(`El año debe estar entre 1930 y ${anioActual}.`);
      return;
    }

    // Validar placa contra tipo de vehículo
    const tipoSel = tipos.find((t) => String(t.id_tipo_vehiculo) === String(form.id_tipo_vehiculo));
    const vp = validarPlaca(form.placa, tipoSel?.codigo ?? null);
    if (!vp.valida) {
      setError(vp.error);
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        ...form,
        modelo: Number(form.modelo),
        id_tipo_vehiculo: Number(form.id_tipo_vehiculo),
      };
      if (vehiculoEdicion) {
        await actualizarVehiculo(vehiculoEdicion.placa, payload);
      } else {
        await crearVehiculo(payload);
      }
      onExito();
      onClose();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mn-modal-bg" onClick={onClose}>
      <form
        className="mn-modal mn-modal--wide"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3>
          {vehiculoEdicion ? "Editar vehículo" : "Registrar nuevo vehículo"}
        </h3>

        <div className="mn-fieldset-group">
          <legend className="mn-fieldset-legend">Vehículo</legend>
          <div
            className="mn-fieldset"
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            <label className="mn-field">
              Placa *
              <input
                required
                disabled={!!vehiculoEdicion}
                onChange={(e) =>
                  setForm({ ...form, placa: e.target.value.toUpperCase() })
                }
                placeholder="ABC123 / ABC12D"
                maxLength={6}
                style={{
                  textTransform: "uppercase",
                  opacity: vehiculoEdicion ? 0.6 : 1,
                }}
              />
            </label>
            <label className="mn-field">
              Tipo *
              <select
                value={form.id_tipo_vehiculo}
                onChange={(e) =>
                  setForm({ ...form, id_tipo_vehiculo: e.target.value })
                }
                disabled={!!vehiculoEdicion}
              >
                {(Array.isArray(tipos) ? tipos : []).map((t) => (
                  <option key={t.id_tipo_vehiculo} value={t.id_tipo_vehiculo}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="mn-field">
              Color *
              <input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                required
                placeholder="Ingrese color"
                style={{ textTransform: "uppercase" }}
              />
            </label>
            <label className="mn-field">
              Año *
              <input
                type="number"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                required
                min="1930"
                max={new Date().getFullYear()}
                placeholder="INGRESE AÑO"
              />
            </label>
            <label className="mn-field">
              Modelo *
              <input
                value={form.nombre_modelo}
                onChange={(e) =>
                  setForm({ ...form, nombre_modelo: e.target.value })
                }
                required
                placeholder="Ingrese modelo"
                style={{ textTransform: "uppercase" }}
              />
            </label>
          </div>
        </div>

        <div className="mn-fieldset-group">
          <legend className="mn-fieldset-legend">Propietario</legend>
          <div
            className="mn-fieldset"
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            <label className="mn-field">
              Tipo Doc
              <select
                value={form.propietario_tipo_documento}
                onChange={(e) =>
                  setForm({
                    ...form,
                    propietario_tipo_documento: e.target.value,
                  })
                }
              >
                <option value="cc">CC</option>
                <option value="ce">CE</option>
                <option value="nit">NIT</option>
                <option value="pasaporte">Pasaporte</option>
              </select>
            </label>
            <label className="mn-field">
              Documento *
              <input
                value={form.propietario_documento}
                onChange={(e) =>
                  setForm({ ...form, propietario_documento: e.target.value })
                }
                required
                placeholder="Ingrese documento"
                maxLength={20}
                style={{ textTransform: "uppercase" }}
              />
            </label>
            <label className="mn-field">
              Nombre completo *
              <input
                value={form.propietario_nombre}
                onChange={(e) =>
                  setForm({ ...form, propietario_nombre: e.target.value })
                }
                required
                placeholder="Ingrese nombre"
                style={{ textTransform: "uppercase" }}
              />
            </label>
            <label className="mn-field">
              Teléfono
              <input
                value={form.propietario_telefono}
                onChange={(e) =>
                  setForm({ ...form, propietario_telefono: e.target.value })
                }
                placeholder="INGRESE TELÉFONO"
              />
            </label>
            <label className="mn-field">
              Email
              <input
                type="email"
                value={form.propietario_email}
                onChange={(e) =>
                  setForm({ ...form, propietario_email: e.target.value })
                }
                placeholder="INGRESE EMAIL"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="mn-alert mn-alert--err" role="alert">
            <strong>Error:</strong> {error}
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
            disabled={enviando}
          >
            {enviando
              ? "Guardando..."
              : vehiculoEdicion
                ? "Actualizar Registro"
                : "Guardar Registro"}
          </button>
        </div>
      </form>
    </div>
  );
}
