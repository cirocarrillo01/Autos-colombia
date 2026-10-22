// frontend/src/Components/FormulariosConsulta.jsx
import { useState } from "react";
import {
  buscarVehiculo,
  obtenerCeldasDisponibles,
  registrarMovimiento,
} from "../api";
import { validarPlaca } from "../validators/placa";
import "./FormulariosConsulta.css";

const formatoPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor));

// ---------- Subcomponentes de presentación ----------
function PanelVehiculo({ vehiculo }) {
  const alDia = vehiculo.estadoMensualidad === "Al día";
  // El backend devuelve:
  //   - `nombreModelo` -> nombre comercial del modelo (ej. "Toyota Hilux")
  //   - `modelo`       -> año de lanzamiento (ej. "2021")
  //   - `color`        -> color de la carrocería
  // Si vienen vacíos se muestra "—" para no dejar campos en blanco.
  const nombreModelo = vehiculo.nombreModelo?.trim() ?? "";
  const anio = vehiculo.modelo?.trim() ?? "";
  const color = vehiculo.color?.trim() ?? "";
  return (
    <div className="Resultado-panel">
      <div className="Resultado-fila">
        <span className="Resultado-placa">{vehiculo.placa}</span>
        <span className="Resultado-estado">{vehiculo.estado}</span>
        <span className="Resultado-mensualidad">
          {formatoPesos(vehiculo.mensualidad)}
        </span>
        <span className="Resultado-tipo">{vehiculo.tipo}</span>
      </div>
      <div className="Resultado-fila">
        <span className="Resultado-label">Modelo</span>
        <span className="Resultado-valor">{nombreModelo || "—"}</span>
        <span className="Resultado-label">Año</span>
        <span className="Resultado-valor">{anio || "—"}</span>
        <span className="Resultado-label">Color</span>
        <span className="Resultado-valor">{color || "—"}</span>
      </div>
      <div className="Resultado-fila">
        <span className="Resultado-label">Usuario</span>
        <span className="Resultado-valor">{vehiculo.usuario}</span>
        <span className="Resultado-label">Mensualidad</span>
        <span
          className={alDia ? "Resultado-valor-verde" : "Resultado-valor-alerta"}
        >
          {vehiculo.estadoMensualidad}
        </span>
      </div>
    </div>
  );
}

function PanelMovimiento({ movimiento }) {
  return (
    <div className="Movimiento-panel">
      <div className="Movimiento-fila">
        <span className="Movimiento-label">Movimiento</span>
        <span className="Movimiento-valor">#{movimiento.id}</span>
        <span className="Movimiento-label">Placa</span>
        <span className="Movimiento-valor">{movimiento.placa}</span>
        <span className="Movimiento-valor">{movimiento.accion}</span>
      </div>
      <div className="Movimiento-fila">
        <span className="Movimiento-label">Celda</span>
        <span className="Movimiento-valor">{movimiento.celda}</span>
      </div>
      <div className="Movimiento-fila">
        <span className="Movimiento-label">Fecha</span>
        <span className="Movimiento-valor">{movimiento.fecha}</span>
        <span className="Movimiento-label">Hora</span>
        <span className="Movimiento-valor">{movimiento.hora}</span>
      </div>
    </div>
  );
}

function FormulariosConsulta() {
  // ================= INGRESO =================
  const [placaIngreso, setPlacaIngreso] = useState("");
  const [vistaIngreso, setVistaIngreso] = useState("idle"); // idle | resultado | confirmado
  const [vehiculoIngreso, setVehiculoIngreso] = useState(null);
  const [celdasDisponibles, setCeldasDisponibles] = useState([]); // [{ id_celda, codigo, ... }]
  const [celdaSeleccionada, setCeldaSeleccionada] = useState(null); // objeto celda
  const [movimientoIngreso, setMovimientoIngreso] = useState(null);
  const [errorIngreso, setErrorIngreso] = useState("");
  const [alertaIngreso, setAlertaIngreso] = useState(null); // { tipo, mensaje }

  // ================= SALIDA =================
  const [placaSalida, setPlacaSalida] = useState("");
  const [vistaSalida, setVistaSalida] = useState("idle");
  const [vehiculoSalida, setVehiculoSalida] = useState(null);
  const [movimientoSalida, setMovimientoSalida] = useState(null);
  const [errorSalida, setErrorSalida] = useState("");
  const [alertaSalida, setAlertaSalida] = useState(null); // { tipo, mensaje }

  // ---------- INGRESO: acciones ----------
  const handleBuscarIngreso = async () => {
    setErrorIngreso("");
    setAlertaIngreso(null);
    if (!placaIngreso.trim()) {
      setAlertaIngreso({
        tipo: "campo-vacio",
        mensaje: "Ingresa una placa.",
      });
      return;
    }
    // Validación de formato de placa (misma regla que el backend).
    // Carro: AAA### (CAR001 / CAR-001) — Moto: AAA##X (ABC12C).
    const validacionIngreso = validarPlaca(placaIngreso);
    if (!validacionIngreso.valida) {
      setAlertaIngreso({
        tipo: "formato-invalido",
        mensaje: validacionIngreso.error,
      });
      return;
    }
    setPlacaIngreso(validacionIngreso.placa);
    try {
      const vehiculo = await buscarVehiculo(validacionIngreso.placa);
      // Si la placa ya está adentro — alerta amarilla
      if (vehiculo.estado === "Adentro") {
        setAlertaIngreso({
          tipo: "ya-procesada",
          mensaje: "Esta placa ya está adentro, no se puede ingresar de nuevo.",
        });
        return;
      }
      // Si la mensualidad está en mora o sin mensualidad — alerta roja, bloquear ingreso
      if (
        vehiculo.estadoMensualidad === "En mora" ||
        vehiculo.estadoMensualidad === "Sin mensualidad"
      ) {
        setAlertaIngreso({
          tipo: "ingreso-bloqueado",
          mensaje: `La placa ${vehiculo.placa} no puede ingresar. Mensualidad: ${vehiculo.estadoMensualidad}.`,
        });
        // Guardamos el vehículo para mostrar el panel de información
        setVehiculoIngreso(vehiculo);
        setVistaIngreso("resultado");
        return;
      }
      // Solo celdas libres del mismo tipo del vehículo
      const celdas = await obtenerCeldasDisponibles(vehiculo.tipoCodigo);
      if (celdas.length === 0) {
        setErrorIngreso("No hay celdas disponibles para este tipo de vehículo");
        return;
      }
      setVehiculoIngreso(vehiculo);
      setCeldasDisponibles(celdas);
      setCeldaSeleccionada(null);
      setVistaIngreso("resultado");
    } catch (err) {
      // Si el backend devuelve 404 (vehículo no existe) — alerta amarilla "no registrada"
      if (err.status === 404) {
        setAlertaIngreso({
          tipo: "no-registrada",
          mensaje: `La placa ${validacionIngreso.placa} no está registrada en el sistema.`,
        });
      } else {
        setErrorIngreso(err.message);
      }
    }
  };

  const handleIngresar = async () => {
    if (!celdaSeleccionada) {
      setErrorIngreso("Selecciona una celda");
      return;
    }
    setErrorIngreso("");
    try {
      const mov = await registrarMovimiento({
        placa: vehiculoIngreso.placa,
        celda: celdaSeleccionada,
        tipo: "entrada",
      });
      setMovimientoIngreso(mov);
      setVistaIngreso("confirmado");
    } catch (err) {
      // 403: el backend bloquea el ingreso si la mensualidad no está vigente
      if (err.status === 403) {
        setAlertaIngreso({
          tipo: "ingreso-bloqueado",
          mensaje: `No se puede registrar el ingreso: ${err.message}.`,
        });
      } else {
        setErrorIngreso(err.message);
      }
    }
  };

  const handleLimpiarIngreso = () => {
    setPlacaIngreso("");
    setVehiculoIngreso(null);
    setCeldaSeleccionada(null);
    setMovimientoIngreso(null);
    setCeldasDisponibles([]);
    setErrorIngreso("");
    setAlertaIngreso(null);
    setVistaIngreso("idle");
  };

  // ---------- SALIDA: acciones ----------
  const handleBuscarSalida = async () => {
    setErrorSalida("");
    setAlertaSalida(null);
    if (!placaSalida.trim()) {
      setAlertaSalida({
        tipo: "campo-vacio",
        mensaje: "Ingresa una placa.",
      });
      return;
    }
    // Validación de formato de placa (misma regla que ingreso).
    const validacionSalida = validarPlaca(placaSalida);
    if (!validacionSalida.valida) {
      setAlertaSalida({
        tipo: "formato-invalido",
        mensaje: validacionSalida.error,
      });
      return;
    }
    setPlacaSalida(validacionSalida.placa);
    try {
      const vehiculo = await buscarVehiculo(validacionSalida.placa);
      // Si la placa ya está afuera — alerta amarilla
      if (vehiculo.estado !== "Adentro") {
        setAlertaSalida({
          tipo: "ya-procesada",
          mensaje: "Esta placa ya está afuera, no puede salir nuevamente.",
        });
        return;
      }
      setVehiculoSalida(vehiculo);
      setVistaSalida("resultado");
    } catch (err) {
      // Si el backend devuelve 404 (vehículo no existe) — alerta amarilla "no registrada"
      if (err.status === 404) {
        setAlertaSalida({
          tipo: "no-registrada",
          mensaje: `La placa ${validacionSalida.placa} no está registrada en el sistema.`,
        });
      } else {
        setErrorSalida(err.message);
      }
    }
  };

  const handleSalir = async () => {
    setErrorSalida("");
    try {
      const mov = await registrarMovimiento({
        placa: vehiculoSalida.placa,
        tipo: "salida",
      });
      setMovimientoSalida(mov);
      setVistaSalida("confirmado");
    } catch (err) {
      setErrorSalida(err.message);
    }
  };

  const handleLimpiarSalida = () => {
    setPlacaSalida("");
    setVehiculoSalida(null);
    setMovimientoSalida(null);
    setErrorSalida("");
    setAlertaSalida(null);
    setVistaSalida("idle");
  };

  const alPresionarEnter = (accion) => (e) => {
    if (e.key === "Enter") accion();
  };

  // ================= RENDER =================
  // IMPORTANTE: las dos tarjetas son HERMANAS directas de .FormulariosConsulta.
  // Si una tarjeta queda dentro de la otra, el CSS (grid de 2 columnas) deja de aplicar.
  return (
    <div className="FormulariosConsulta">
      {/* ==================== INGRESO (izquierda) ==================== */}
      <div className="Consulta-card">
        <h2 className="Consulta-titulo">Ingresar</h2>

        <div className="Consulta-input-row">
          <input
            type="text"
            className="Consulta-input"
            placeholder="Inserte placa de vehículo"
            value={placaIngreso}
            onChange={(e) => setPlacaIngreso(e.target.value.toUpperCase())}
            onKeyDown={alPresionarEnter(handleBuscarIngreso)}
            disabled={vistaIngreso !== "idle"}
          />
          <button
            className="Consulta-btn-buscar"
            onClick={handleBuscarIngreso}
            disabled={vistaIngreso !== "idle"}
          >
            Buscar
          </button>
        </div>

        {errorIngreso && <p className="Error">{errorIngreso}</p>}

        {/* Alertas visuales de ingreso */}
        {alertaIngreso && (
          <div className={`Alerta-${alertaIngreso.tipo}`}>
            <p className="Alerta-mensaje">{alertaIngreso.mensaje}</p>
          </div>
        )}

        {vistaIngreso === "resultado" && vehiculoIngreso && (
          <>
            <PanelVehiculo vehiculo={vehiculoIngreso} />

            {/* Solo mostrar grid de celdas si NO está bloqueado */}
            {alertaIngreso?.tipo !== "ingreso-bloqueado" && (
              <div className="Celdas-grid">
                {celdasDisponibles.map((celda) => (
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
                disabled={
                  !celdaSeleccionada ||
                  alertaIngreso?.tipo === "ingreso-bloqueado"
                }
              >
                Ingresar
              </button>
              <button
                className="Consulta-btn-limpiar"
                onClick={handleLimpiarIngreso}
              >
                Limpiar
              </button>
            </div>
          </>
        )}

        {vistaIngreso === "confirmado" && movimientoIngreso && (
          <>
            <PanelMovimiento movimiento={movimientoIngreso} />
            <div className="Consulta-acciones">
              <button
                className="Consulta-btn-limpiar"
                onClick={handleLimpiarIngreso}
              >
                Nuevo ingreso
              </button>
            </div>
          </>
        )}
      </div>

      {/* ==================== SALIDA (derecha) ==================== */}
      <div className="Consulta-card">
        <h2 className="Consulta-titulo">Salir</h2>

        <div className="Consulta-input-row">
          <input
            type="text"
            className="Consulta-input"
            placeholder="Inserte placa de vehículo"
            value={placaSalida}
            onChange={(e) => setPlacaSalida(e.target.value.toUpperCase())}
            onKeyDown={alPresionarEnter(handleBuscarSalida)}
            disabled={vistaSalida !== "idle"}
          />
          <button
            className="Consulta-btn-buscar"
            onClick={handleBuscarSalida}
            disabled={vistaSalida !== "idle"}
          >
            Buscar
          </button>
        </div>

        {errorSalida && <p className="Error">{errorSalida}</p>}

        {/* Alertas visuales de salida */}
        {alertaSalida && (
          <div className={`Alerta-${alertaSalida.tipo}`}>
            <p className="Alerta-mensaje">{alertaSalida.mensaje}</p>
          </div>
        )}

        {vistaSalida === "resultado" && vehiculoSalida && (
          <>
            <PanelVehiculo vehiculo={vehiculoSalida} />
            <div className="Consulta-acciones">
              <button className="Consulta-btn-salir" onClick={handleSalir}>
                Salir
              </button>
              <button
                className="Consulta-btn-limpiar"
                onClick={handleLimpiarSalida}
              >
                Limpiar
              </button>
            </div>
          </>
        )}

        {vistaSalida === "confirmado" && movimientoSalida && (
          <>
            <PanelMovimiento movimiento={movimientoSalida} />
            <div className="Consulta-acciones">
              <button
                className="Consulta-btn-limpiar"
                onClick={handleLimpiarSalida}
              >
                Nueva salida
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FormulariosConsulta;
