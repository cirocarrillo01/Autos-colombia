// frontend/src/features/auth/context/AuthContext.jsx
import {
  createContext,
  useContext,
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
  getRefreshToken,
  setRefreshToken,
  refreshToken as apiRefresh,
} from "../../../services/api";

const USER_KEY = "ac_user";

const AuthContext = createContext({
  isLoggedIn: false,
  loading: false,
  usuario: null,
  rol: null,
  error: null,
  login: async () => {},
  logout: () => {},
  manejarError: () => null,
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

const guardarUsuario = (u) =>
  u
    ? localStorage.setItem(USER_KEY, JSON.stringify(u))
    : localStorage.removeItem(USER_KEY);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    if (!getToken()) return null;
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => Boolean(getToken()));
  const [error, setError] = useState(null);

  // Función para manejar errores HTTP con mensajes apropiados
  const manejarError = useCallback((error) => {
    if (error.status === 401) {
      // Sesión expirada o credenciales incorrectas
      setToken(null);
      localStorage.removeItem("ac_token");
      window.dispatchEvent(new Event("auth:expired"));
      setError(
        "Credenciales incorrectas. Por favor, inicie sesión nuevamente.",
      );
      setLoading(false);
      return "/login"; // Indica que debe navegar al login
    } else if (error.status === 403) {
      setError("No tiene permiso para acceder a este recurso.");
      setLoading(false);
      return null;
    } else if (error.status === 404) {
      setError("El recurso solicitado no existe.");
      setLoading(false);
      return null;
    } else if (error.status === 422) {
      // Validación de datos - el error.message contiene los detalles
      setError(error.message || "Datos de validación incorrectos.");
      setLoading(false);
      return null;
    } else if (error.status === 500) {
      setError("Error interno del servidor. Por favor, intente más tarde.");
      setLoading(false);
      return null;
    } else {
      // Error genérico
      setError(error.message || "Error inesperado");
      setLoading(false);
      return null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Al cargar la app, valida el token y refresca los datos del usuario
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
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

  // Token vencido en cualquier petición → volver al login
  useEffect(() => {
    const alExpirar = () => {
      guardarUsuario(null);
      setUsuario(null);
    };
    window.addEventListener("auth:expired", alExpirar);
    return () => window.removeEventListener("auth:expired", alExpirar);
  }, []);

  const login = useCallback(async (usuario_login, clave) => {
    setError(null);
    const data = await apiLogin(usuario_login, clave);
    setToken(data.token);
    setRefreshToken(data.refresh_token);
    guardarUsuario(data.usuario);
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(async () => {
    // 1. Intenta avisar al backend con los tokens aún vigentes para que
    //    revoque el jti del access y todos los refresh del usuario.
    try {
      await apiLogout();
    } catch {
      // Ignorar errores del servidor en el logout.
    }
    // 2. Limpieza local SIEMPRE, incluso si el servidor falló.
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

export default AuthContext;
