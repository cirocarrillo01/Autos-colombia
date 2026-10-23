// frontend/src/Components/ingreso-salida/PanelMovimiento.jsx
// Comprobante del movimiento registrado (entrada o salida).

export default function PanelMovimiento({ movimiento }) {
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
