//frontend/src/Components/ingreso-salida/FormularioIngreso.jsx
// Formulario de ingreso: búsqueda por placa o documento, selección de celda y registro.

import { useState, useRef, useEffect, useCallback } from "react";
import {
  buscarVehiculo,
  buscarVehiculosPorDocumento,
  obtenerCeldasDisponibles,
  registrarMovimiento,
} from "../../services/api";
import { validarPlaca } from "../../validators/placa";
import AlertaPlaca from "./AlertaPlaca.jsx";
import PanelVehiculo from "./PanelVehiculo.jsx";
import PanelMovimiento from "./PanelMovimiento.jsx";
import SelectorVehiculoDialog from "./SelectorVehiculoDialog.jsx";

const esDocumento = (t) => /^\d{5,20}$/.test(t.trim());
const MSG_SIN_CELDAS = "No hay celdas disponibles para este tipo de vehículo";

export default function FormularioIngreso() {
  const [entrada, setEntrada] = useState("");
  const [vista, setVista] = useState("idle");
  const [vehiculo, setVehiculo] = useState(null);
  const [opciones, setOpciones] = useState(null);
  const [celdas, setCeldas] = useState([]);
  const [celdaSeleccionada, setCeldaSeleccionada] = useState(null);
  const [movimiento, setMovimiento] = useState(null);
  const [error, setError] = useState("");
  const [alerta, setAlerta] = useState(null);
  const timerRef = useRef(null);

  function handleLimpiar() {
    setEntrada("");
    setVehiculo(null);
    setOpciones(null);
    setCeldas([]);
    setCeldaSeleccionada(null);
    setMovimiento(null);
    setError("");
    setAlerta(null);
    setVista("idle");
  }

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

  const procesarVehiculo = async (encontrado) => {
    setEntrada(encontrado.placa);
    if (encontrado.estado === "Dentro") {
      setAlerta({
        tipo: "ya-procesada",
        mensaje: "El vehículo ya se encuentra dentro del parqueadero",
      });
      return;
    }
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
    const disponibles = await obtenerCeldasDisponibles(encontrado.tipoCodigo);
    if (disponibles.length === 0) {
      setError(MSG_SIN_CELDAS);
      return;
    }
    setVehiculo(encontrado);
    setCeldas(disponibles);
    setCeldaSeleccionada(null);
    setVista("resultado");
  };

  const handleBuscar = async () => {
    setError("");
    setAlerta(null);
    const texto = entrada.trim();
    if (!texto) {
      setAlerta({
        tipo: "campo-vacio",
        mensaje: "Ingresa una placa o un documento.",
      });
      return;
    }
    try {
      if (esDocumento(texto)) {
        const lista = await buscarVehiculosPorDocumento(texto);
        if (lista.length === 1) {
          await procesarVehiculo(lista[0]);
        } else {
          setOpciones(lista);
        }
        return;
      }
      const validacion = validarPlaca(texto);
      if (!validacion.valida) {
        setAlerta({ tipo: "formato-invalido", mensaje: validacion.error });
        return;
      }
      setEntrada(validacion.placa);
      await procesarVehiculo(await buscarVehiculo(validacion.placa));
    } catch (err) {
      if (err.status === 404) {
        setAlerta({
          tipo: "no-registrada",
          mensaje: esDocumento(texto)
            ? `No hay vehículos registrados con el documento ${texto}.`
            : `La placa ${texto} no está registrada en el sistema.`,
        });
      } else {
        setError(err.message);
      }
    }
  };

  const handleSeleccionarVehiculo = async (v) => {
    setOpciones(null);
    try {
      await procesarVehiculo(v);
    } catch (err) {
      setError(err.message);
    }
  };
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
      if (err.status === 403) {
        setAlerta({
          tipo: "ingreso-bloqueado",
          mensaje: `No se puede registrar el ingreso: ${err.message}.`,
        });
      } else if (err.status === 409) {
        setError(err.message);
        setCeldaSeleccionada(null);
        try {
          const disponibles = await obtenerCeldasDisponibles(
            vehiculo.tipoCodigo,
          );
          setCeldas(disponibles);
          if (disponibles.length === 0) setError(MSG_SIN_CELDAS);
        } catch (e2) {
          setError(e2.message);
        }
      } else {
        setError(err.message);
      }
    }
  };

  const bloqueado = alerta?.tipo === "ingreso-bloqueado";

  const opcionesDialogo = (opciones ?? []).map((v) => ({
    key: v.id,
    titulo: `${v.placa} · ${v.tipo}`,
    detalle: [v.nombreModelo, v.color, `Mensualidad: ${v.estadoMensualidad}`]
      .filter(Boolean)
      .join(" · "),
    deshabilitado: v.estado === "Dentro",
    motivo: "Ya se encuentra dentro del parqueadero",
    original: v,
  }));

  return (
    <div className="Consulta-card">
      <h2 className="Consulta-titulo">Ingresar</h2>

      <div className="Consulta-input-row">
        <input
          type="text"
          className="Consulta-input"
          placeholder="Placa o documento del propietario"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value.toUpperCase())}
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

      <SelectorVehiculoDialog
        abierto={opciones !== null}
        titulo="Seleccione el vehículo que ingresa"
        descripcion={`El documento ${entrada} tiene ${opciones?.length ?? 0} vehículos asociados.`}
        opciones={opcionesDialogo}
        onSeleccionar={handleSeleccionarVehiculo}
        onCerrar={() => setOpciones(null)}
      />
    </div>
  );
}
