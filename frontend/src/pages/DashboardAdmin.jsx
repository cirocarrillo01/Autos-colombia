// frontend/src/pages/DashboardAdmin.jsx
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";
import { resumenCeldas, listarUsuarios } from "../services/api";
import ResumenCeldas from "../Components/ResumenCeldas.jsx";
import "./Gestion.css";

export default function DashboardAdmin() {
  const { usuario } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [totalUsuarios, setTotalUsuarios] = useState(null);
  const [error, setError] = useState("");

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

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 5000);
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

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
