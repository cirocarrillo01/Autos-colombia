//frontend/src/Components/ResumenCeldas.jsx
// Componente de resumen: cards + tabla por tipo (total, libres, ocupadas, no disponibles).

import "../pages/Gestion.css";

const COLS = [
  ["total", "Total"],
  ["libres", "Libres"],
  ["ocupadas", "Ocupadas"],
  ["no_disponibles", "No disponibles"],
];

/**
 * Componente ResumenCeldas - Muestra estadísticas de celdas en cards y tabla por tipo.
 * @param {Object} props
 * @param {Object} props.resumen - Datos de resumen del backend.
 * @param {Object} props.resumen.totales - { total, libres, ocupadas, no_disponibles }
 * @param {Array} props.resumen.porTipo - Array de objetos por tipo de vehículo.
 */
export default function ResumenCeldas({ resumen }) {
  if (!resumen) return null;
  const { totales, porTipo } = resumen;
  return (
    <>
      <div className="Cards-row">
        {COLS.map(([k, label]) => (
          <div className="Stat" key={k}>
            <span className="Stat-valor">{Number(totales?.[k] ?? 0)}</span>
            <span className="Stat-label">{label}</span>
          </div>
        ))}
      </div>
      <div className="Card Tabla-wrap">
        <table className="Tabla">
          <thead>
            <tr>
              <th>Tipo</th>
              {COLS.map(([k, l]) => (
                <th key={k}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {porTipo.map((t) => (
              <tr key={t.tipo}>
                <td style={{ textTransform: "capitalize" }}>{t.tipo}</td>
                {COLS.map(([k]) => (
                  <td key={k}>{Number(t[k])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}