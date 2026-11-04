//frontend/src/features/auth/context/AuthContextObject.js
// Definición del objeto Context y el hook useAuth.

import { createContext, useContext } from "react";

/**
 * @typedef {Object} AuthState
 * @property {boolean} isLoggedIn - Indica si el usuario está autenticado.
 * @property {boolean} loading - Indica si hay una operación de autenticación en curso.
 * @property {Object|null} usuario - Datos del usuario autenticado (id, nombreCompleto, usuario_login, etc.).
 * @property {string|null} rol - Rol del usuario ("administrador" | "operador" | null).
 * @property {string|null} error - Mensaje de error si la autenticación falló.
 * @property {Function} login - Función para iniciar sesión.
 * @property {Function} logout - Función para cerrar sesión.
 * @property {Function} manejarError - Función para procesar errores de autenticación.
 * @property {Function} clearError - Función para limpiar el estado de error.
 */

/**
 * Contexto de autenticación para la aplicación.
 * Provee estado y funciones de autenticación a toda la app.
 * @type {import('react').Context<AuthState>}
 */
export const AuthContext = createContext({
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

/**
 * Hook personalizado para acceder al contexto de autenticación.
 * @returns {AuthState} Estado y funciones de autenticación.
 */
export const useAuth = () => useContext(AuthContext);

export default AuthContext;