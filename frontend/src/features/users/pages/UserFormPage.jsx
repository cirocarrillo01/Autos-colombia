//frontend/src/features/users/pages/UserFormPage.jsx
// Formulario de creación y edición de usuarios (RF1.6).

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  obtenerUsuario,
  registrarUsuario,
  editarUsuario,
} from "../../../services/api";
import "../../../pages/Gestion.css";

const VACIO = {
  rol: "operador",
  tipo_documento: "cc",
  documento: "",
  nombres: "",
  apellidos: "",
  telefono: "",
  email: "",
  usuario_login: "",
  clave: "",
  confirmarClave: "",
};

/**
 * Componente UserFormPage - Formulario para registrar o actualizar datos de usuarios.
 * Requiere re-autenticación del administrador (claveAdmin) para acciones de escritura.
 */
export default function UserFormPage() {
  const { id } = useParams();
  const editando = Boolean(id) && id !== "new" && !isNaN(Number(id));
  const navigate = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [claveAdmin, setClaveAdmin] = useState("");

  useEffect(() => {
    if (!editando) return;
    obtenerUsuario(id)
      .then((u) =>
        setForm({
          rol: u.rol,
          tipo_documento: u.tipo_documento,
          documento: u.documento,
          nombres: u.nombres,
          apellidos: u.apellidos,
          telefono: u.telefono ?? "",
          email: u.email ?? "",
          usuario_login: u.usuario_login,
          clave: "",
        }),
      )
      .catch((e) => setError(e.message));
  }, [id, editando]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  /**
   * Envía los datos del usuario al backend.
   * @param {React.FormEvent} e 
   */
  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      if (!editando) {
        if (form.clave !== form.confirmarClave) {
          setError("Las claves no coinciden");
          return;
        }
        const { confirmarClave: _confirmar, ...datosRegistro } = form;
        datosRegistro.claveAdmin = claveAdmin;
        await registrarUsuario(datosRegistro);
      } else {
        const { clave: _clave, ...datos } = form;
        datos.claveAdmin = claveAdmin;
        await editarUsuario(id, datos);
      }
      navigate("/users");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const campo = (name, label, props = {}) => (
    <div className="Field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        className="Input"
        value={form[name]}
        onChange={cambiar}
        {...props}
      />
    </div>
  );

  return (
    <div className="Page">
      <h2>{editando ? "Editar usuario" : "Nuevo usuario"}</h2>
      {error && <p className="Msg Msg-error">{error}</p>}

      <form className="Card" onSubmit={enviar}>
        <div className="Form-grid">
          <div className="Field">
            <label htmlFor="rol">Rol</label>
            <select
              id="rol"
              name="rol"
              className="Select"
              value={form.rol}
              onChange={cambiar}
            >
              <option value="operador">Operador</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
          <div className="Field">
            <label htmlFor="tipo_documento">Tipo de documento</label>
            <select
              id="tipo_documento"
              name="tipo_documento"
              className="Select"
              value={form.tipo_documento}
              onChange={cambiar}
            >
              <option value="cc">Cédula de ciudadanía</option>
              <option value="ce">Cédula de extranjería</option>
              <option value="nit">NIT</option>
              <option value="pasaporte">Pasaporte</option>
            </select>
          </div>
          {campo("documento", "Número de documento", {
            required: true,
            minLength: 5,
            maxLength: 20,
          })}
          {campo("nombres", "Nombres", { required: true, maxLength: 80 })}
          {campo("apellidos", "Apellidos", { required: true, maxLength: 80 })}
          {campo("telefono", "Teléfono", { maxLength: 20 })}
          {campo("email", "Correo", { type: "email", maxLength: 120 })}
          {campo("usuario_login", "Usuario de acceso", {
            required: true,
            minLength: 3,
            maxLength: 40,
          })}
          {!editando && (
            <>
              {campo("clave", "Clave", {
                type: "password",
                required: true,
                minLength: 4,
              })}
              {campo("confirmarClave", "Confirmar clave", {
                type: "password",
                required: true,
                minLength: 4,
              })}
              <div className="Field">
                <label htmlFor="claveAdminCrear">Clave de administrador *</label>
                <input
                  id="claveAdminCrear"
                  name="claveAdmin"
                  className="Input"
                  type="password"
                  placeholder="Su clave para confirmar la creación"
                  value={claveAdmin}
                  onChange={(e) => setClaveAdmin(e.target.value)}
                  required
                />
              </div>
            </>
          )}
        </div>

        {editando && (
          <div className="Field">
            <label htmlFor="claveAdmin">Clave de administrador *</label>
            <input
              id="claveAdmin"
              name="claveAdmin"
              className="Input"
              type="password"
              placeholder="Su clave para confirmar el cambio"
              value={claveAdmin}
              onChange={(e) => setClaveAdmin(e.target.value)}
              required
            />
          </div>
        )}

        <div className="Toolbar" style={{ marginTop: 20 }}>
          <button
            className="Btn Btn--primary"
            type="submit"
            disabled={enviando}
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
          <Link className="Btn" to="/users">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}