//frontend/src/Components/ingreso-salida/PanelVehiculo.jsx
// Panel que muestra los datos del vehículo consultado (placa, modelo, usuario, mensualidad).

import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";

/**
 * Formatea un valor como moneda COP.
 * @param {number|string} valor
 * @returns {string}
 */
const formatoPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor));

/**
 * Componente PanelVehiculo - Muestra datos del vehículo en ingreso/salida.
 * @param {Object} props
 * @param {Object} props.vehiculo - Datos del vehículo desde el backend.
 * @param {string} props.vehiculo.placa
 * @param {string} props.vehiculo.estado - "Adentro" | "Afuera"
 * @param {number} props.vehiculo.mensualidad
 * @param {string} props.vehiculo.estadoMensualidad - "Al día" | "En mora" | "Sin mensualidad"
 * @param {string} props.vehiculo.tipoCodigo - "carro" | "moto"
 * @param {string} props.vehiculo.nombreModelo
 * @param {string} props.vehiculo.modelo - año
 * @param {string} props.vehiculo.color
 * @param {string} props.vehiculo.usuario
 */
export default function PanelVehiculo({ vehiculo }) {
  const alDia = vehiculo.estadoMensualidad === "Al día";
  const nombreModelo = vehiculo.nombreModelo?.trim() ?? "";
  const anio = vehiculo.modelo?.trim() ?? "";
  const color = vehiculo.color?.trim() ?? "";
  const tipoCodigo = vehiculo.tipoCodigo?.toLowerCase() ?? "";

  const tipoColor = alDia ? "#388e3c" : "#d32f2f";
  const panelClase = alDia ? "Resultado-panel" : "Resultado-panel Resultado-panel-mora";
  const mensualidadClase = alDia
    ? "Resultado-mensualidad"
    : "Resultado-mensualidad Resultado-mensualidad-mora";

  return (
    <div className={panelClase}>
      <div className="Resultado-fila">
        <span className="Resultado-placa">{vehiculo.placa}</span>
        <span className="Resultado-estado">{vehiculo.estado}</span>
        <span className={mensualidadClase}>
          {formatoPesos(vehiculo.mensualidad)}
        </span>
        <span className="Resultado-tipo">
          {tipoCodigo === "carro" ? (
            <DirectionsCarIcon fontSize="large" style={{ color: tipoColor }} />
          ) : (
            <TwoWheelerIcon fontSize="large" style={{ color: tipoColor }} />
          )}
        </span>
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