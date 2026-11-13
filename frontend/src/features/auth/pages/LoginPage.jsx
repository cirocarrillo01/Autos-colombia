//frontend/src/features/auth/pages/LoginPage.jsx
// Página de inicio de sesión (RF1.1, RF1.2).

import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const { isLoggedIn, loading, login, manejarError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario_login: "", clave: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!loading && isLoggedIn) return <Navigate to="/dashboard" replace />;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ S9383: async/await con try/catch/finally (no crea Promises intermedias).
  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError("");

    try {
      const usuario = await login(form.usuario_login.trim(), form.clave);
      if (usuario) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setError("Error en el login. Intente nuevamente.");
    } catch (err) {
      manejarError(err);
      setError(err.message || "Error en el login");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="Login">
      <form
        className="Login-card"
        // ✅ S9383: la sentencia termina con .catch() explícito.
        onSubmit={(e) =>
          enviar(e).catch((error) => {
            console.error("Error inesperado en login:", error);
          })
        }
      >
        <h1 className="Login-titulo">Auto Colombia</h1>
        <p className="Login-sub">Ingrese al sistema</p>

        <label htmlFor="usuario_login">Usuario</label>
        <input
          data-testid="login-usuario"
          id="usuario_login"
          name="usuario_login"
          value={form.usuario_login}
          onChange={cambiar}
          autoComplete="username"
          required
          placeholder="usuario"
        />

        <label htmlFor="clave">Clave</label>
        <input
          data-testid="login-clave"
          id="clave"
          name="clave"
          type="password"
          value={form.clave}
          onChange={cambiar}
          autoComplete="current-password"
          required
          placeholder="clave"
        />

        {error && <p className="Login-error">{error}</p>}

        <button data-testid="login-submit" type="submit" disabled={enviando}>
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
