//frontend/src/pages/IngresoSalida.jsx
// Pantalla de ingreso y salida de vehículos.

import FormularioIngreso from "../Components/ingreso-salida/FormularioIngreso.jsx";
import FormularioSalida from "../Components/ingreso-salida/FormularioSalida.jsx";
import "./IngresoSalida.css";

/**
 * Componente IngresoSalida - Página principal para gestión de entrada/salida de vehículos.
 * Renderiza dos formularios lado a lado: uno para ingresos y otro para salidas.
 * @returns {JSX.Element} Contenedor con FormularioIngreso y FormularioSalida.
 */
export default function IngresoSalida() {
  return (
    <div className="FormulariosConsulta">
      <FormularioIngreso />
      <FormularioSalida />
    </div>
  );
}