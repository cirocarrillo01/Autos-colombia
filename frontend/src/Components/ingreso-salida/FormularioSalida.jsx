// frontend/src/Components/ingreso-salida/FormularioSalida.jsx
// Tarjeta "Salir". Vistas: idle -> resultado -> confirmado.
import { useState, useRef, useEffect } from "react";
import { buscarVehiculo, registrarMovimiento } from "../../services/api";
import { validarPlaca } from "../../validators/placa";
import AlertaPlaca from "./AlertaPlaca.jsx";
import PanelVehiculo from "./PanelVehiculo.jsx";
import PanelMovimiento from "./PanelMovimiento.jsx";

export default function FormularioSalida() {
  const [placa, setPlaca] = useState("");
  const [vista, setVista] = useState("idle"); // idle | resultado | confirmado
  const [vehiculo, setVehiculo] = useState(null);
  const [movimiento, setMovimiento] = useState(null);
  const [error, setError] = useState("");
  const [alerta, setAlerta] = useState(null); // { tipo, mensaje }
  const timerRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (vista !== "idle" || alerta !== null) {
      timerRef.current = setTimeout(() => {
        handleLimpiar();
      }, 35000);
    }
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [vista, alerta]);

  const handleBuscar = async () => {
    setError("");
    setAlerta(null);
    if (!placa.trim()) {
      setAlerta({ tipo: "campo-vacio", mensaje: "Ingresa una placa." });
      return;
    }
    const validacion = validarPlaca(placa);
    if (!validacion.valida) {
      setAlerta({ tipo: "formato-invalido", mensaje: validacion.error });
      return;
    }
    setPlaca(validacion.placa);

    try {
      const encontrado = await buscarVehiculo(validacion.placa);
      if (encontrado.estado !== "Adentro") {
        setAlerta({
          tipo: "ya-procesada",
          mensaje: "Esta placa ya está afuera, no puede salir nuevamente.",
        });
        return;
      }
      setVehiculo(encontrado);
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

  const handleSalir = async () => {
    setError("");
    try {
      const mov = await registrarMovimiento({
        placa: vehiculo.placa,
        tipo: "salida",
      });
      setMovimiento(mov);
      setVista("confirmado");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLimpiar = () => {
    setPlaca("");
    setVehiculo(null);
    setMovimiento(null);
    setError("");
    setAlerta(null);
    setVista("idle");
  };

  return (
    <div className="Consulta-card">
      <h2 className="Consulta-titulo">Salir</h2>

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
          <div className="Consulta-acciones">
            <button className="Consulta-btn-salir" onClick={handleSalir}>
              Salir
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
    </div>
  );
}
