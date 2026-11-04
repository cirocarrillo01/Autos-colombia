//frontend/src/Components/ingreso-salida/FormularioIngreso.jsx
// Formulario de ingreso de vehículos: búsqueda, selección de celda y registro.

import { useState, useRef, useEffect, useCallback } from "react";
import {
  buscarVehiculo,
  obtenerCeldasDisponibles,
  registrarMovimiento,
} from "../../services/api";
import { validarPlaca } from "../../validators/placa";
import AlertaPlaca from "./AlertaPlaca.jsx";
import PanelVehiculo from "./PanelVehiculo.jsx";
import PanelMovimiento from "./PanelMovimiento.jsx";

/**
 * Componente FormularioIngreso - Tarjeta para registrar ingreso de vehículos.
 * Flujo: idle (búsqueda) -> resultado (vehículo + celdas) -> confirmado (movimiento registrado).
 * Auto-limpia a los 35s de inactividad en vistas no-idle.
 */
export default function FormularioIngreso() {
  const [placa, setPlaca] = useState("");
  const [vista, setVista] = useState("idle"); // idle | resultado | confirmado
  const [vehiculo, setVehiculo] = useState(null);
  const [celdas, setCeldas] = useState([]); // [{ id_celda, codigo, ... }]
  const [celdaSeleccionada, setCeldaSeleccionada] = useState(null);
  const [movimiento, setMovimiento] = useState(null);
  const [error, setError] = useState("");
  const [alerta, setAlerta] = useState(null); // { tipo, mensaje }
  const timerRef = useRef(null);

  /**
   * Limpia todo el formulario y vuelve a estado idle.
   */
  function handleLimpiar() {
    setPlaca("");
    setVehiculo(null);
    setCeldas([]);
    setCeldaSeleccionada(null);
    setMovimiento(null);
    setError("");
    setAlerta(null);
    setVista("idle");
  }

  /**
   * Reinicia el temporizador de auto-limpieza (35s).
   */
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (vista !== "idle" || alerta !== null) {
      timerRef.current = setTimeout(() => {
        handleLimpiar();
      }, 35000);
    }
  }, [vista, alerta]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [vista, alerta, resetTimer]);

  /**
   * Busca el vehículo por placa y valida estado/mensualidad.
   * Actualiza estado: vehiculo, celdas, vista, alerta.
   */
  const handleBuscar = async () => {
    setError("");
    setAlerta(null);
    if (!placa.trim()) {
      setAlerta({ tipo: "campo-vacio", mensaje: "Ingresa una placa." });
      return;
    }
    // Misma regla que el backend. Carro: ABC123 / Moto: ABC12C
    const validacion = validarPlaca(placa);
    if (!validacion.valida) {
      setAlerta({ tipo: "formato-invalido", mensaje: validacion.error });
      return;
    }
    setPlaca(validacion.placa);

    try {
      const encontrado = await buscarVehiculo(validacion.placa);

      if (encontrado.estado === "Adentro") {
        setAlerta({
          tipo: "ya-procesada",
          mensaje: "Esta placa ya está adentro, no se puede ingresar de nuevo.",
        });
        return;
      }

      // Sin mensualidad vigente: se muestra el vehiculo pero se bloquea el ingreso
      if (
        encontrado.estadoMensualidad === "En mora" ||
        encontrado.estadoMensualidad === "Sin mensualidad"
      ) {
        setAlerta({
          tipo: "ingreso-bloqueado",
          mensaje: `La placa ${encontrado.placa} no puede ingresar. Mensualidad: ${encontrado.estadoMensualidad}.`,
        });
        setVehiculo(encontrado);
        setVista("resultado");
        return;
      }

      // Solo celdas libres del mismo tipo del vehiculo
      const disponibles = await obtenerCeldasDisponibles(encontrado.tipoCodigo);
      if (disponibles.length === 0) {
        setError("No hay celdas disponibles para este tipo de vehículo");
        return;
      }
      setVehiculo(encontrado);
      setCeldas(disponibles);
      setCeldaSeleccionada(null);
      setVista("resultado");
    } catch (err) {
      if (err.status === 404) {
        setAlerta({
          tipo: "no-registrada",
          mensaje: `La placa ${validacion.placa} no está registrada en el sistema.`,
        });
      } else {
        setError(err.message);
      }
    }
  };

  /**
   * Registra el movimiento de entrada en el backend.
   * @returns {Promise<void>}
   */
  const handleIngresar = async () => {
    if (!celdaSeleccionada) {
      setError("Selecciona una celda");
      return;
    }
    setError("");
    try {
      const mov = await registrarMovimiento({
        placa: vehiculo.placa,
        celda: celdaSeleccionada,
        tipo: "entrada",
      });
      setMovimiento(mov);
      setVista("confirmado");
    } catch (err) {
      // 403: el backend bloquea el ingreso si la mensualidad no esta vigente
      if (err.status === 403) {
        setAlerta({
          tipo: "ingreso-bloqueado",
          mensaje: `No se puede registrar el ingreso: ${err.message}.`,
        });
      } else {
        setError(err.message);
      }
    }
  };

  const bloqueado = alerta?.tipo === "ingreso-bloqueado";

  return (
    <div className="Consulta-card">
      <h2 className="Consulta-titulo">Ingresar</h2>

      <div className="Consulta-input-row">
        <input
          type="text"
          className="Consulta-input"
          placeholder="Inserte placa de vehículo"
          value={placa}
          onChange={(e) => setPlaca(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
          disabled={vista !== "idle"}
        />
        <button
          className="Consulta-btn-buscar"
          onClick={handleBuscar}
          disabled={vista !== "idle"}
        >
          Buscar
        </button>
      </div>

      {error && <p className="Error">{error}</p>}
      <AlertaPlaca alerta={alerta} />

      {vista === "resultado" && vehiculo && (
        <>
          <PanelVehiculo vehiculo={vehiculo} />

          {!bloqueado && (
            <div className="Celdas-grid">
              {celdas.map((celda) => (
                <button
                  key={celda.id_celda}
                  className={`Celda ${
                    celdaSeleccionada?.id_celda === celda.id_celda
                      ? "Celda--selected"
                      : ""
                  }`}
                  onClick={() => setCeldaSeleccionada(celda)}
                >
                  {celda.codigo}
                </button>
              ))}
            </div>
          )}

          <div className="Consulta-acciones">
            <button
              className="Consulta-btn-ingresar"
              onClick={handleIngresar}
              disabled={!celdaSeleccionada || bloqueado}
            >
              Ingresar
            </button>
            <button className="Consulta-btn-limpiar" onClick={handleLimpiar}>
              Limpiar
            </button>
          </div>
        </>
      )}

      {vista === "confirmado" && movimiento && (
        <>
          <PanelMovimiento movimiento={movimiento} />
          <div className="Consulta-acciones">
            <button className="Consulta-btn-limpiar" onClick={handleLimpiar}>
              Nuevo ingreso
            </button>
          </div>
        </>
      )}
    </div>
  );
}