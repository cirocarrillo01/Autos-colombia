//frontend/src/Components/ingreso-salida/AlertaPlaca.jsx
// Aviso visual según el tipo de alerta en ingreso/salida.

/**
 * Componente AlertaPlaca - Muestra alertas contextuales en formularios de ingreso/salida.
 * @param {Object} props
 * @param {Object|null} props.alerta - Objeto alerta o null.
 * @param {string} props.alerta.tipo - "campo-vacio" | "formato-invalido" | "no-registrada" | "ya-procesada" | "ingreso-bloqueado"
 * @param {string} props.alerta.mensaje - Texto a mostrar.
 */
export default function AlertaPlaca({ alerta }) {
  if (!alerta) return null;
  return (
    <div className={`Alerta-${alerta.tipo}`}>
      <p className="Alerta-mensaje">{alerta.mensaje}</p>
    </div>
  );
}