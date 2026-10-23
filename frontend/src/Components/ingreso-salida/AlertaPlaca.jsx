// frontend/src/Components/ingreso-salida/AlertaPlaca.jsx
// Aviso visual segun el tipo: campo-vacio | formato-invalido | no-registrada |
// ya-procesada | ingreso-bloqueado (las clases estan en IngresoSalida.css).

export default function AlertaPlaca({ alerta }) {
  if (!alerta) return null;
  return (
    <div className={`Alerta-${alerta.tipo}`}>
      <p className="Alerta-mensaje">{alerta.mensaje}</p>
    </div>
  );
}
