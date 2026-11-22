// frontend/src/api/client.js
// Cliente Axios central: adjunta Bearer, maneja 401/403 y errores de red.
import axios from "axios";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:3000/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("ac_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("ac_token");
      if (!location.pathname.startsWith("/login"))
        location.assign("/login?expired=1");
    }
    return Promise.reject(err);
  },
);

export function apiError(err, fallback = "Ocurrió un error inesperado") {
  const data = err?.response?.data;
  if (!data) return err?.message ?? fallback;
  if (typeof data === "string") return data;
  return data.mensaje || data.error || data.message || fallback;
}
