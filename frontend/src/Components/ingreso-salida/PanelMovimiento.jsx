//frontend/src/Components/ingreso-salida/PanelMovimiento.jsx
// Comprobante del movimiento registrado (entrada o salida).

/**
 * @param {Object} props
 * @param {Object} props.movimiento - Respuesta del backend (entrada o salida).
 */
export default function PanelMovimiento({ movimiento }) {
  return (
    <div className="Movimiento-panel">
      {movimiento.mensaje && <p className="Msg Msg-ok">{movimiento.mensaje}</p>}

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

      {movimiento.accion === "salida" && movimiento.fecha_ingreso && (
        <div className="Movimiento-fila">
          <span className="Movimiento-label">Entrada</span>
          <span className="Movimiento-valor">
            {movimiento.fecha_ingreso.fecha} {movimiento.fecha_ingreso.hora}
          </span>
        </div>
      )}

      <div className="Movimiento-fila">
        <span className="Movimiento-label">Fecha</span>
        <span className="Movimiento-valor">{movimiento.fecha}</span>
        <span className="Movimiento-label">Hora</span>
        <span className="Movimiento-valor">{movimiento.hora}</span>
      </div>

      {movimiento.accion === "salida" && movimiento.permanencia && (
        <div className="Movimiento-fila">
          <span className="Movimiento-label">Permanencia</span>
          <span className="Movimiento-valor">{movimiento.permanencia}</span>
        </div>
      )}
    </div>
  );
}