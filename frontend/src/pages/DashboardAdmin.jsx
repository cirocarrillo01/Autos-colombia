//frontend/src/pages/DashboardAdmin.jsx
// Dashboard de administrador: resumen de celdas y accesos rápidos.

import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";
import { resumenCeldas, listarUsuarios } from "../services/api";
import ResumenCeldas from "../Components/ResumenCeldas.jsx";
import { usePolling } from "../hooks/usePolling";
import "./Gestion.css";

/**
 * Componente DashboardAdmin - Panel principal para administradores.
 * Muestra resumen de celdas (total/libres/ocupadas/no disponibles) y total de usuarios.
 * Polling cada 30s para actualizar el resumen.
 * Accesos rápidos: Usuarios, Celdas, Ingreso/Salida.
 */
export default function DashboardAdmin() {
  const { usuario } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [totalUsuarios, setTotalUsuarios] = useState(null);
  const [error, setError] = useState("");

  /**
   * Carga resumen de celdas y total de usuarios.
   */
  const cargar = useCallback(async () => {
    try {
      const [r, u] = await Promise.all([
        resumenCeldas(),
        listarUsuarios({ limit: 1 }),
      ]);
      setResumen(r);
      setTotalUsuarios(u.total);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  usePolling(cargar, 30000);

  return (
    <div className="Page">
      <h2>Panel de administración</h2>
      <p>Bienvenido, {usuario?.nombreCompleto ?? usuario?.usuario_login}</p>
      {error && <p className="Msg Msg-error">{error}</p>}

      <h3>Celdas</h3>
      <ResumenCeldas resumen={resumen} />

      <div className="Toolbar">
        <Link className="Btn Btn--primary" to="/users">
          Gestionar usuarios{totalUsuarios !== null && ` (${totalUsuarios})`}
        </Link>
        <Link className="Btn Btn--ghost" to="/celdas">
          Gestionar celdas
        </Link>
        <Link className="Btn Btn--ghost" to="/ingreso/salida">
          Ingreso / Salida
        </Link>
      </div>
    </div>
  );
}