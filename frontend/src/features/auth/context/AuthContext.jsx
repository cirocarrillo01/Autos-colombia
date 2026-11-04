//frontend/src/features/auth/context/AuthContext.jsx
// Proveedor global de autenticación.

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  me,
  getToken,
  setToken,
  setRefreshToken,
} from "../../../services/api";
import { guardarUsuario } from "./authUtils.js";
import { AuthContext, useAuth } from "./AuthContextObject.js";

const USER_KEY = "ac_user";

/**
 * Proveedor de autenticación para toda la aplicación.
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    if (!getToken()) return null;
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });
  // loading es true solo si hay token; se setea false tras verificación async
  const [loading, setLoading] = useState(() => Boolean(getToken()));
  const [error, setError] = useState(null);

  /**
   * Maneja errores HTTP y actualiza el estado de error.
   * @param {Error & {status?: number}} error 
   * @returns {string|null} Ruta a redirigir (ej. '/login') o null.
   */
  const manejarError = useCallback((error) => {
    if (error.status === 401) {
      setToken(null);
      localStorage.removeItem("ac_token");
      window.dispatchEvent(new Event("auth:expired"));
      setError(
        "Credenciales incorrectas. Por favor, inicie sesión nuevamente.",
      );
      setLoading(false);
      return "/login";
    } else if (error.status === 403) {
      setError("No tiene permiso para acceder a este recurso.");
      setLoading(false);
      return null;
    } else if (error.status === 404) {
      setError("El recurso solicitado no existe.");
      setLoading(false);
      return null;
    } else if (error.status === 422) {
      setError(error.message || "Datos de validación incorrectos.");
      setLoading(false);
      return null;
    } else if (error.status === 500) {
      setError("Error interno del servidor. Por favor, intente más tarde.");
      setLoading(false);
      return null;
    } else {
      setError(error.message || "Error inesperado");
      setLoading(false);
      return null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Al cargar la app, valida el token y refresca los datos del usuario
  useEffect(() => {
    const token = getToken();
    if (!token) {
      // Sin token: loading ya es false por inicialización perezosa
      return;
    }
    me()
      .then((u) => {
        setUsuario(u);
        guardarUsuario(u);
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          setToken(null);
          guardarUsuario(null);
          setUsuario(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Token vencido en cualquier petición → limpiar sesión local
  useEffect(() => {
    const alExpirar = () => {
      guardarUsuario(null);
      setUsuario(null);
    };
    window.addEventListener("auth:expired", alExpirar);
    return () => window.removeEventListener("auth:expired", alExpirar);
  }, []);

  /**
   * Inicia sesión del usuario.
   * @param {string} usuario_login 
   * @param {string} clave 
   * @returns {Promise<Object>}
   */
  const login = useCallback(async (usuario_login, clave) => {
    setError(null);
    const data = await apiLogin(usuario_login, clave);
    setToken(data.token);
    setRefreshToken(data.refresh_token);
    guardarUsuario(data.usuario);
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  /**
   * Cierra sesión: notifica al backend y limpia estado local.
   * @returns {Promise<void>}
   */
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignorar errores del servidor en el logout.
    }
    guardarUsuario(null);
    setUsuario(null);
    setError(null);
    setToken(null);
    setRefreshToken(null);
  }, []);

  const value = useMemo(
    () => ({
      usuario,
      rol: usuario?.rol ?? null,
      isLoggedIn: Boolean(usuario),
      loading,
      error,
      login,
      logout,
      manejarError,
      clearError,
    }),
    [usuario, loading, error, login, logout, manejarError, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { useAuth };
export default AuthProvider;