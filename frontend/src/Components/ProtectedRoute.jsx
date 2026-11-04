//frontend/src/Components/ProtectedRoute.jsx
// HOC de protección de rutas: exige autenticación y opcionalmente roles.

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";

/**
 * Componente ProtectedRoute - Protege rutas exigiendo sesión y roles.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar si autorizado.
 * @param {string[]} [props.roles] - Roles permitidos (ej. ["administrador"]).
 * @returns {React.ReactElement|null} children, o redirección a /login o /dashboard.
 */
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