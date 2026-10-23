// frontend/src/Components/ingreso-salida/PanelVehiculo.jsx
// Datos del vehiculo consultado. Los campos vacios se muestran como "—".

const formatoPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor));

export default function PanelVehiculo({ vehiculo }) {
  const alDia = vehiculo.estadoMensualidad === "Al día";
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
