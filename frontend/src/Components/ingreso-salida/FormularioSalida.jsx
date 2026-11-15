//frontend/src/Components/ingreso-salida/FormularioSalida.jsx
// Salida: placa o documento, selección, resumen previo y registro.
import { useState, useCallback } from "react";
import { buscarVehiculosDentro, registrarMovimiento } from "../../services/api";
import { validarPlaca } from "../../validators/placa";
import { esDocumento } from "../../validators/documento";
import { useAutoLimpiar } from "../../hooks/useAutoLimpiar";
import AlertaPlaca from "./AlertaPlaca.jsx";
import ResumenSalida from "./ResumenSalida.jsx";
import PanelMovimiento from "./PanelMovimiento.jsx";
import SelectorVehiculoDialog from "./SelectorVehiculoDialog.jsx";

export default function FormularioSalida() {
  const [entrada, setEntrada] = useState("");
  const [vista, setVista] = useState("idle");
  const [candidatos, setCandidatos] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [movimiento, setMovimiento] = useState(null);
  const [error, setError] = useState("");
  const [alerta, setAlerta] = useState(null);
  const [cargando, setCargando] = useState(false);

  const handleLimpiar = useCallback(() => {
    setEntrada("");
    setCandidatos(null);
    setSeleccionado(null);
    setMovimiento(null);
    setError("");
    setAlerta(null);
    setVista("idle");
    setCargando(false);
  }, []);

  useAutoLimpiar(vista !== "idle" || alerta !== null, handleLimpiar);

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

    let consulta = texto;
    if (!esDocumento(texto)) {
      const v = validarPlaca(texto);
      if (!v.valida) {
        return setAlerta({ tipo: "formato-invalido", mensaje: v.error });
      }
      consulta = v.placa;
      setEntrada(v.placa);
    }

    setCargando(true);
    try {
      const r = await buscarVehiculosDentro(consulta);
      const lista = r?.data ?? r;
      setCargando(false);

      if (lista.length === 1) {
        setSeleccionado(lista[0]);
        setVista("resultado");
      } else {
        setCandidatos(lista);
      }
    } catch (err) {
      setCargando(false);

      if (err.status === 404) {
        setAlerta({
          tipo: "ya-procesada",
          mensaje: `No se encontró el vehículo ${texto} dentro del parqueadero.`,
        });
      } else {
        setError(err.message);
      }
    }
  }, [entrada]);

  const handleSeleccionar = useCallback((item) => {
    setCandidatos(null);
    setSeleccionado(item);
    setEntrada(item.placa);
    setVista("resultado");
  }, []);

  const handleSalir = useCallback(async () => {
    if (!seleccionado || cargando) return;

    setError("");
    setCargando(true);

    try {
      const mov = await registrarMovimiento({
        placa: seleccionado.placa,
        tipo: "salida",
      });
      setMovimiento(mov);
      setVista("confirmado");
    } catch (err) {
      setCargando(false);

      if (err.status === 400) {
        setSeleccionado(null);
        setVista("idle");
        setAlerta({ tipo: "ya-procesada", mensaje: err.message });
      } else {
        setError(err.message);
      }
    }
  }, [seleccionado, cargando]);

  const opcionesDialogo = (candidatos ?? []).map((c) => ({
    key: c.id_acceso,
    titulo: `${c.placa} · ${c.tipo}`,
    detalle: `Celda ${c.celda ?? "—"} · Entró ${c.entrada?.fecha ?? "—"} ${c.entrada?.hora ?? "—"} · ${c.permanencia ?? "—"}`,
    original: c,
  }));

  return (
    <div className="Consulta-card">
      <h2 className="Consulta-titulo">Salir</h2>
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

      {vista === "resultado" && seleccionado && (
        <>
          <ResumenSalida item={seleccionado} />
          <div className="Consulta-acciones">
            <button
              className="Consulta-btn-salir"
              onClick={handleSalir}
              disabled={cargando}
            >
              {cargando ? "Procesando..." : "Confirmar salida"}
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
              Nueva salida
            </button>
          </div>
        </>
      )}

      <SelectorVehiculoDialog
        abierto={candidatos !== null}
        titulo="Seleccione el vehículo que sale"
        descripcion={`El documento ${entrada} tiene ${candidatos?.length ?? 0} vehículos dentro del parqueadero.`}
        opciones={opcionesDialogo}
        onSeleccionar={handleSeleccionar}
        onCerrar={() => setCandidatos(null)}
      />
    </div>
  );
}