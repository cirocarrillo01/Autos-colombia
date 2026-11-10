//frontend/src/Components/ingreso-salida/ResumenSalida.jsx
// Resumen previo a confirmar la salida (HU04 #3).

/**
 * @param {Object} props
 * @param {Object} props.item - Elemento devuelto por GET /movimientos/dentro.
 */
export default function ResumenSalida({ item }) {
  return (
    <div className="Resultado-panel">
      <div className="Resultado-fila">
        <span className="Resultado-placa">{item.placa}</span>
        <span className="Resultado-estado">Dentro</span>
        <span className="Resultado-tipo">{item.tipo}</span>
      </div>
      <div className="Resultado-fila">
        <span className="Resultado-label">Propietario</span>
        <span className="Resultado-valor">{item.propietario}</span>
        <span className="Resultado-label">Celda</span>
        <span className="Resultado-valor">{item.celda}</span>
      </div>
      <div className="Resultado-fila">
        <span className="Resultado-label">Hora de entrada</span>
        <span className="Resultado-valor">
          {item.entrada.fecha} {item.entrada.hora}
        </span>
      </div>
      <div className="Resultado-fila">
        <span className="Resultado-label">Hora de salida</span>
        <span className="Resultado-valor">
          {item.salida.fecha} {item.salida.hora}
        </span>
      </div>
      <div className="Resultado-fila">
        <span className="Resultado-label">Permanencia</span>
        <span className="Resultado-valor-verde">{item.permanencia}</span>
      </div>
    </div>
  );
}