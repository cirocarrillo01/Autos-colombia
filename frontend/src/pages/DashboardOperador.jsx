//frontend/src/pages/DashboardOperador.jsx
// Dashboard de operador: resumen de celdas y acceso rápido a ingreso/salida.

import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";
import { resumenCeldas } from "../services/api";
import ResumenCeldas from "../Components/ResumenCeldas.jsx";
import { usePolling } from "../hooks/usePolling";
import "./Gestion.css";

/**
 * Componente DashboardOperador - Panel principal para operadores.
 * Muestra resumen de celdas con polling de 30s y enlace a Ingreso/Salida.
 */
export default function DashboardOperador() {
  const { usuario } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const r = await resumenCeldas();
      setResumen(r);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  usePolling(cargar, 30000);

  return (
    <div className="Page">
      <h2>Panel de operador</h2>
      <p>Bienvenido, {usuario?.nombreCompleto ?? usuario?.usuario_login}</p>
      {error && <p className="Msg Msg-error">{error}</p>}
      <h3>Celdas</h3>
      <ResumenCeldas resumen={resumen} />
      <div className="Toolbar">
        <Link className="Btn Btn--primary" to="/ingreso/salida">
          Registrar ingreso / salida
        </Link>
      </div>
    </div>
  );
}