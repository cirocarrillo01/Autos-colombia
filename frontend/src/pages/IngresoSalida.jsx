// frontend/src/pages/IngresoSalida.jsx
// Pantalla de ingreso y salida de vehiculos: Ingreso a la izquierda y Salida a
// la derecha, del mismo tamano. Las dos tarjetas deben ser hijas DIRECTAS de
// .FormulariosConsulta; si una queda dentro de la otra, el grid se rompe.

import FormularioIngreso from "../Components/ingreso-salida/FormularioIngreso.jsx";
import FormularioSalida from "../Components/ingreso-salida/FormularioSalida.jsx";
import "./IngresoSalida.css";

export default function IngresoSalida() {
  return (
    <div className="FormulariosConsulta">
      <FormularioIngreso />
      <FormularioSalida />
    </div>
  );
}
