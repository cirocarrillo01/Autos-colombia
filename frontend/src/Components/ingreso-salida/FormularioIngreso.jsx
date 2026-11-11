//frontend/src/Components/ingreso-salida/FormularioIngreso.jsx
// Ingreso: búsqueda por placa o documento, selección de celda y registro.
import { useState, useCallback } from "react";
import {
  buscarVehiculo,
  buscarVehiculosPorDocumento,
  obtenerCeldasDisponibles,
  registrarMovimiento,
} from "../../services/api";
import { validarPlaca } from "../../validators/placa";
import { esDocumento } from "../../validators/documento";
import { useAutoLimpiar } from "../../hooks/useAutoLimpiar";
import AlertaPlaca from "./AlertaPlaca.jsx";
import PanelVehiculo from "./PanelVehiculo.jsx";
import PanelMovimiento from "./PanelMovimiento.jsx";
import SelectorVehiculoDialog from "./SelectorVehiculoDialog.jsx";

const MSG_SIN_CELDAS = "No hay celdas disponibles para este tipo de vehículo";
const ESTADO_OK = "Al día";

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
  const [cargando, setCargando] = useState(false);

  const handleLimpiar = useCallback(() => {
    setEntrada("");
    setVehiculo(null);
    setOpciones(null);
    setCeldas([]);
    setCeldaSeleccionada(null);
    setMovimiento(null);
    setError("");
    setAlerta(null);
    setVista("idle");
    setCargando(false);
  }, []);

  useAutoLimpiar(vista !== "idle" || alerta !== null, handleLimpiar);

  const procesarVehiculo = useCallback(
    async (v) => {
      setEntrada(v.placa);

      if (v.estado === "Dentro") {
        return setAlerta({
          tipo: "ya-procesada",
          mensaje: "El vehículo ya se encuentra dentro del parqueadero",
        });
      }

      // Cualquier estado distinto de "Al día" bloquea el ingreso.
      if (v.estadoMensualidad !== ESTADO_OK) {
        setAlerta({
          tipo: "ingreso-bloqueado",
          mensaje: `La placa ${v.placa} no puede ingresar. Mensualidad: ${v.estadoMensualidad}.`,
        });
        setVehiculo(v);
        setVista("resultado");
        return;
      }

      try {
        const disponibles = await obtenerCeldasDisponibles(v.tipoCodigo);
        if (!disponibles.length) {
          return setError(MSG_SIN_CELDAS);
        }
        setVehiculo(v);
        setCeldas(disponibles);
        setCeldaSeleccionada(null);
        setVista("resultado");
      } catch (err) {
        setError(err.message || "No se pudieron cargar las celdas disponibles.");
      }
    },
    []
  );

  const handleBuscar = useCallback(async () => {
    setError("");
    setAlerta(null);
    setCargando(false);

    const texto = entrada.trim();
    if (!texto) {
      return setAlerta({
        tipo: "campo-vacio",
        mensaje: "Ingresa una placa o un documento.",
      });
    }

    try {
      if (esDocumento(texto)) {
        const lista = await buscarVehiculosPorDocumento(texto);
        return lista.length === 1
          ? procesarVehiculo(lista[0])
          : setOpciones(lista);
      }

      const val = validarPlaca(texto);
      if (!val.valida) {
        return setAlerta({ tipo: "formato-invalido", mensaje: val.error });
      }

      setEntrada(val.placa);
      await procesarVehiculo(await buscarVehiculo(val.placa));
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
  }, [entrada, procesarVehiculo]);

  const handleSeleccionarVehiculo = useCallback(
    async (v) => {
      setOpciones(null);
      try {
        await procesarVehiculo(v);
      } catch (err) {
        setError(err.message);
      }
    },
    [procesarVehiculo]
  );

  const handleIngresar = useCallback(async () => {
    if (!celdaSeleccionada) return setError("Selecciona una celda");
    if (!vehiculo) return;
    if (cargando) return;

    setError("");
    setCargando(true);

    try {
      const mov = await registrarMovimiento({
        placa: vehiculo.placa,
        celda: celdaSeleccionada,
        tipo: "entrada",
      });
      setMovimiento(mov);
      setVista("confirmado");
    } catch (err) {
      setCargando(false);

      if (err.status === 403) {
        setAlerta({
          tipo: "ingreso-bloqueado",
          mensaje: `No se puede registrar el ingreso: ${err.message}.`,
        });
      } else if (err.status === 409) {
        setError(err.message);
        setCeldaSeleccionada(null);

        try {
          const d = await obtenerCeldasDisponibles(vehiculo.tipoCodigo);
          setCeldas(d);
          if (!d.length) setError(MSG_SIN_CELDAS);
        } catch (e2) {
          // No sobreescribir el error original del 409 si el refresco falla.
          setError((prev) => prev || err.message || "No se pudieron actualizar las celdas.");
        }
      } else {
        setError(err.message);
      }
    }
  }, [celdaSeleccionada, vehiculo, cargando]);

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
              {celdas.map((c) => (
                <button
                  key={c.id_celda}
                  className={`Celda ${
                    celdaSeleccionada?.id_celda === c.id_celda
                      ? "Celda--selected"
                      : ""
                  }`}
                  onClick={() => setCeldaSeleccionada(c)}
                >
                  {c.codigo}
                </button>
              ))}
            </div>
          )}

          <div className="Consulta-acciones">
            <button
              className="Consulta-btn-ingresar"
              onClick={handleIngresar}
              disabled={!celdaSeleccionada || bloqueado || cargando}
            >
              {cargando ? "Procesando..." : "Ingresar"}
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
            <button
              className="Consulta-btn-limpiar"
              onClick={handleLimpiar}
            >
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