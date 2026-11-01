// frontend/src/Components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";

/** Exige sesión; con `roles` además exige uno de esos roles. */
export default function ProtectedRoute({ roles, children }) {
  const { isLoggedIn, loading, rol } = useAuth();
  const location = useLocation();

  // Asegura que `roles` siempre sea un arreglo para evitar errores de tipo
  // si se pasa un string o un valor indefinido.
  const allowedRoles = Array.isArray(roles) ? roles : [];

  if (loading) return <p style={{ padding: 40 }}>Cargando…</p>;
  if (!isLoggedIn)
    return <Navigate to="/login" replace state={{ from: location }} />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(rol))
    return <Navigate to="/dashboard" replace />;
  return children;
}
