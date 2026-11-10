//frontend/src/Components/ingreso-salida/FormularioSalida.jsx
// Formulario de salida: placa o documento, selección, resumen previo y registro.

import { useState, useRef, useEffect, useCallback } from "react";
import { buscarVehiculosDentro, registrarMovimiento } from "../../services/api";
import { validarPlaca } from "../../validators/placa";
import AlertaPlaca from "./AlertaPlaca.jsx";
import ResumenSalida from "./ResumenSalida.jsx";
import PanelMovimiento from "./PanelMovimiento.jsx";
import SelectorVehiculoDialog from "./SelectorVehiculoDialog.jsx";

const esDocumento = (t) => /^\d{5,20}$/.test(t.trim());

export default function FormularioSalida() {
  const [entrada, setEntrada] = useState("");
  const [vista, setVista] = useState("idle");
  const [candidatos, setCandidatos] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [movimiento, setMovimiento] = useState(null);
  const [error, setError] = useState("");
  const [alerta, setAlerta] = useState(null);
  const timerRef = useRef(null);

  function handleLimpiar() {
    setEntrada("");
    setCandidatos(null);
    setSeleccionado(null);
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

    let consulta = texto;
    if (!esDocumento(texto)) {
      const v = validarPlaca(texto);
      if (!v.valida) {
        setAlerta({ tipo: "formato-invalido", mensaje: v.error });
        return;
      }
      consulta = v.placa;
      setEntrada(v.placa);
    }

    try {
      const lista = await buscarVehiculosDentro(consulta);
      if (lista.length === 1) {
        setSeleccionado(lista[0]);
        setVista("resultado");
      } else {
        setCandidatos(lista);
      }
    } catch (err) {
      if (err.status === 404) {
        setAlerta({ tipo: "ya-procesada", mensaje: err.message });
      } else {
        setError(err.message);
      }
    }
  };

  const handleSeleccionar = (item) => {
    setCandidatos(null);
    setSeleccionado(item);
    setEntrada(item.placa);
    setVista("resultado");
  };

  const handleSalir = async () => {
    setError("");
    try {
      const mov = await registrarMovimiento({
        placa: seleccionado.placa,
        tipo: "salida",
      });
      setMovimiento(mov);
      setVista("confirmado");
    } catch (err) {
      if (err.status === 400) {
        setSeleccionado(null);
        setVista("idle");
        setAlerta({ tipo: "ya-procesada", mensaje: err.message });
      } else {
        setError(err.message);
      }
    }
  };

  const opcionesDialogo = (candidatos ?? []).map((c) => ({
    key: c.id_acceso,
    titulo: `${c.placa} · ${c.tipo}`,
    detalle: `Celda ${c.celda} · Entró ${c.entrada.fecha} ${c.entrada.hora} · ${c.permanencia}`,
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
            <button className="Consulta-btn-salir" onClick={handleSalir}>
              Confirmar salida
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

