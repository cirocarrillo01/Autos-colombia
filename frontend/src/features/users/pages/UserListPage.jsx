// frontend/src/features/users/pages/UserListPage.jsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import {
  listarUsuarios,
  cambiarEstadoUsuario,
  restablecerClaveUsuario,
  verifyPassword,
} from "../../../services/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import "../../../pages/Gestion.css";

const LIMITE = 10;

export default function UserListPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState({ search: "", rol: "", estado: "" });
  const [aplicados, setAplicados] = useState(filtros);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [msg, setMsg] = useState(null);

  // Diálogo de restablecimiento de clave: 1) confirmar admin → 2) nueva clave.
  const [modal, setModal] = useState({
    abierto: false,
    usuario: null,
    paso: 1,
    adminClave: "",
    nueva: "",
    confirmar: "",
    error: "",
    enviando: false,
  });

  // Re-autenticación ANTES de navegar al formulario de edición.
  // Es una medida de seguridad (defensa en profundidad): se verifica la
  // identidad del admin antes de exponer el formulario que modificará
  // datos de otro usuario. El backend vuelve a validar claveAdmin al
  // aplicar el cambio (segunda capa).
  const [editConfirm, setEditConfirm] = useState({
    abierto: false,
    usuario: null,
    adminClave: "",
    error: "",
    enviando: false,
  });

  // Re-autenticación ANTES de crear un nuevo usuario.
  const [nuevoConfirm, setNuevoConfirm] = useState({
    abierto: false,
    adminClave: "",
    error: "",
    enviando: false,
  });

  const cargar = useCallback(async () => {
    try {
      setData(await listarUsuarios({ ...aplicados, page, limit: LIMITE }));
    } catch (e) {
      setMsg({ tipo: "error", texto: e.message });
    }
  }, [aplicados, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
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

  const buscar = (e) => {
    e.preventDefault();
    setPage(1);
    setAplicados(filtros);
  };

  const accion = async (fn, okTexto) => {
    try {
      await fn();
      setMsg({ tipo: "ok", texto: okTexto });
      cargar();
    } catch (e) {
      setMsg({ tipo: "error", texto: e.message });
    }
  };

  const alternarEstado = (u) =>
    accion(
      () =>
        cambiarEstadoUsuario(
          u.id_usuario,
          u.estado === "activo" ? "inactivo" : "activo",
        ),
      `Usuario ${u.estado === "activo" ? "desactivado" : "activado"}`,
    );

  const abrirClave = (u) =>
    setModal({
      abierto: true,
      usuario: u,
      paso: 1,
      adminClave: "",
      nueva: "",
      confirmar: "",
      error: "",
      enviando: false,
    });

  const cerrarClave = () =>
    setModal((m) => ({ ...m, abierto: false, error: "" }));

  // ── Editar: re-autenticación previa (1ª capa) ─────────────────────────
  const abrirEditar = (u) =>
    setEditConfirm({
      abierto: true,
      usuario: u,
      adminClave: "",
      error: "",
      enviando: false,
    });

  const cerrarEditar = () =>
    setEditConfirm((m) => ({ ...m, abierto: false, error: "" }));

  const confirmarEditar = async () => {
    setEditConfirm((m) => ({ ...m, enviando: true, error: "" }));
    try {
      await verifyPassword(editConfirm.adminClave);
      cerrarEditar();
      navigate(`/users/${editConfirm.usuario.id_usuario}/edit`);
    } catch (e) {
      setEditConfirm((m) => ({ ...m, error: e.message }));
    } finally {
      setEditConfirm((m) => ({ ...m, enviando: false }));
    }
  };

  // ── Nuevo usuario: re-autenticación previa ────────────────────────────
  const abrirNuevoUsuario = () =>
    setNuevoConfirm({
      abierto: true,
      adminClave: "",
      error: "",
      enviando: false,
    });

  const cerrarNuevo = () =>
    setNuevoConfirm((m) => ({ ...m, abierto: false, error: "" }));

  const confirmarNuevo = async () => {
    setNuevoConfirm((m) => ({ ...m, enviando: true, error: "" }));
    try {
      await verifyPassword(nuevoConfirm.adminClave);
      cerrarNuevo();
      navigate("/users/new");
    } catch (e) {
      setNuevoConfirm((m) => ({ ...m, error: e.message }));
    } finally {
      setNuevoConfirm((m) => ({ ...m, enviando: false }));
    }
  };

  // ── Restablecer clave: paso 1 (verificar admin) ───────────────────────
  const confirmarAdmin = async () => {
    setModal((m) => ({ ...m, enviando: true, error: "" }));
    try {
      await verifyPassword(modal.adminClave);
      setModal((m) => ({ ...m, paso: 2, error: "" }));
    } catch (e) {
      setModal((m) => ({ ...m, error: e.message }));
    } finally {
      setModal((m) => ({ ...m, enviando: false }));
    }
  };

  // ── Restablecer clave: paso 2 (enviar nueva) ──────────────────────────
  const guardarClave = async () => {
    if (modal.nueva.length < 4) {
      setModal((m) => ({
        ...m,
        error: "La clave debe tener al menos 4 caracteres",
      }));
      return;
    }
    if (modal.nueva !== modal.confirmar) {
      setModal((m) => ({ ...m, error: "Las claves no coinciden" }));
      return;
    }
    setModal((m) => ({ ...m, enviando: true, error: "" }));
    try {
      await restablecerClaveUsuario(
        modal.usuario.id_usuario,
        modal.nueva,
        modal.adminClave,
      );
      setMsg({ tipo: "ok", texto: "Clave restablecida" });
      cerrarClave();
      cargar();
    } catch (e) {
      setModal((m) => ({ ...m, error: e.message }));
    } finally {
      setModal((m) => ({ ...m, enviando: false }));
    }
  };

  const paginas = Math.max(Math.ceil(data.total / LIMITE), 1);

  const estaConectado = (u) => Boolean(u?.sesion_activa);

  return (
    <div className="Page">
      <h2>Usuarios</h2>
      {msg && <p className={`Msg Msg-${msg.tipo}`}>{msg.texto}</p>}

      <form className="Toolbar" onSubmit={buscar}>
        <input
          className="Input"
          placeholder="Nombre, documento o usuario"
          value={filtros.search}
          onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
        />
        <select
          className="Select"
          value={filtros.rol}
          onChange={(e) => setFiltros({ ...filtros, rol: e.target.value })}
        >
          <option value="">Todos los roles</option>
          <option value="administrador">Administrador</option>
          <option value="operador">Operador</option>
        </select>
        <select
          className="Select"
          value={filtros.estado}
          onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <button className="Btn" type="submit">
          Buscar
        </button>
        {/* type="button": evita disparar el submit del form de búsqueda */}
        <button
          type="button"
          className="Btn Btn--primary"
          onClick={abrirNuevoUsuario}
        >
          Nuevo usuario
        </button>
      </form>

      <div className="Card Tabla-wrap">
        <table className="Tabla">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={6}>Sin resultados</td>
              </tr>
            )}
            {data.rows.map((u) => {
              if (!u) return null;
              const esYo = u.id_usuario === usuario?.id_usuario;
              return (
                <tr key={u.id_usuario}>
                  <td>{u.usuario_login}</td>
                  <td>
                    {u.nombres} {u.apellidos}
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{u.rol}</td>
                  <td>
                    <span
                      className={`Badge ${
                        estaConectado(u) ? "Badge--libre" : "Badge--inactiva"
                      }`}
                      style={{ minWidth: "115px", textAlign: "center" }}
                    >
                      {estaConectado(u) ? "Conectado" : "Desconectado"}
                    </span>
                  </td>
                  <td>
                    {u.ultimo_acceso
                      ? new Date(u.ultimo_acceso).toLocaleString("es-CO")
                      : "—"}
                  </td>
                  <td>
                    <div className="Tabla-acciones">
                      {/* Editar abre diálogo de re-autenticación */}
                      <button
                        type="button"
                        className="Btn Btn--sm"
                        onClick={() => abrirEditar(u)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="Btn Btn--sm"
                        onClick={() => abrirClave(u)}
                      >
                        Clave
                      </button>
                      <button
                        type="button"
                        className={`Btn Btn--sm ${
                          u.estado === "activo" ? "Btn--danger" : "Btn--success"
                        }`}
                        style={{ minWidth: "110px" }}
                        disabled={esYo}
                        onClick={() => alternarEstado(u)}
                      >
                        {u.estado === "activo" ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="Paginacion">
          <button
            type="button"
            className="Btn Btn--sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page} de {paginas} ({data.total} usuarios)
          </span>
          <button
            type="button"
            className="Btn Btn--sm"
            disabled={page >= paginas}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </div>

        {/* ===== Diálogo: restablecer clave (2 pasos) ===== */}
        <Dialog
          open={modal.abierto}
          onClose={cerrarClave}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            Cambiar clave de {modal.usuario?.usuario_login}
          </DialogTitle>
          <DialogContent>
            {modal.paso === 1 ? (
              <>
                <p>Confirme con su clave de administrador:</p>
                <input
                  className="Input"
                  type="password"
                  placeholder="Clave de administrador"
                  value={modal.adminClave}
                  onChange={(e) =>
                    setModal((m) => ({ ...m, adminClave: e.target.value }))
                  }
                  disabled={modal.enviando}
                  style={{ width: "100%" }}
                />
              </>
            ) : (
              <>
                <p>Nueva clave para {modal.usuario?.usuario_login}:</p>
                <input
                  className="Input"
                  type="password"
                  placeholder="Nueva clave"
                  value={modal.nueva}
                  onChange={(e) =>
                    setModal((m) => ({ ...m, nueva: e.target.value }))
                  }
                  disabled={modal.enviando}
                  style={{ width: "100%", marginBottom: 8 }}
                />
                <input
                  className="Input"
                  type="password"
                  placeholder="Confirmar nueva clave"
                  value={modal.confirmar}
                  onChange={(e) =>
                    setModal((m) => ({ ...m, confirmar: e.target.value }))
                  }
                  disabled={modal.enviando}
                  style={{ width: "100%" }}
                />
              </>
            )}
            {modal.error && <p className="Msg Msg-error">{modal.error}</p>}
          </DialogContent>
          <DialogActions>
            {modal.paso === 1 ? (
              <button
                type="button"
                className="Btn Btn--primary"
                onClick={confirmarAdmin}
                disabled={modal.enviando || !modal.adminClave}
              >
                {modal.enviando ? "Verificando…" : "Continuar"}
              </button>
            ) : (
              <button
                type="button"
                className="Btn Btn--primary"
                onClick={guardarClave}
                disabled={modal.enviando || !modal.nueva || !modal.confirmar}
              >
                {modal.enviando ? "Guardando…" : "Guardar"}
              </button>
            )}
            <button
              type="button"
              className="Btn"
              onClick={cerrarClave}
              disabled={modal.enviando}
            >
              Cancelar
            </button>
          </DialogActions>
        </Dialog>

        {/* ===== Diálogo: re-autenticación antes de editar (1ª capa) ===== */}
        <Dialog
          open={editConfirm.abierto}
          onClose={cerrarEditar}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Confirmar identidad para editar</DialogTitle>
          <DialogContent>
            <p>
              Va a editar datos personales de{" "}
              <strong>{editConfirm.usuario?.usuario_login}</strong>. Confirme
              con su clave de administrador:
            </p>
            <input
              className="Input"
              type="password"
              placeholder="Clave de administrador"
              value={editConfirm.adminClave}
              onChange={(e) =>
                setEditConfirm((m) => ({ ...m, adminClave: e.target.value }))
              }
              disabled={editConfirm.enviando}
              style={{ width: "100%", marginTop: 12 }}
            />
            {editConfirm.error && (
              <p className="Msg Msg-error">{editConfirm.error}</p>
            )}
          </DialogContent>
          <DialogActions>
            <button
              type="button"
              className="Btn Btn--primary"
              onClick={confirmarEditar}
              disabled={editConfirm.enviando || !editConfirm.adminClave}
            >
              {editConfirm.enviando ? "Verificando…" : "Continuar"}
            </button>
            <button
              type="button"
              className="Btn"
              onClick={cerrarEditar}
              disabled={editConfirm.enviando}
            >
              Cancelar
            </button>
          </DialogActions>
        </Dialog>

        {/* ===== Diálogo: re-autenticación antes de crear usuario ===== */}
        <Dialog
          open={nuevoConfirm.abierto}
          onClose={cerrarNuevo}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Confirmar identidad para crear usuario</DialogTitle>
          <DialogContent>
            <p>
              Va a crear un nuevo usuario. Confirme con su clave de
              administrador:
            </p>
            <input
              className="Input"
              type="password"
              placeholder="Clave de administrador"
              value={nuevoConfirm.adminClave}
              onChange={(e) =>
                setNuevoConfirm((m) => ({ ...m, adminClave: e.target.value }))
              }
              disabled={nuevoConfirm.enviando}
              style={{ width: "100%", marginTop: 12 }}
            />
            {nuevoConfirm.error && (
              <p className="Msg Msg-error">{nuevoConfirm.error}</p>
            )}
          </DialogContent>
          <DialogActions>
            <button
              type="button"
              className="Btn Btn--primary"
              onClick={confirmarNuevo}
              disabled={nuevoConfirm.enviando || !nuevoConfirm.adminClave}
            >
              {nuevoConfirm.enviando ? "Verificando…" : "Continuar"}
            </button>
            <button
              type="button"
              className="Btn"
              onClick={cerrarNuevo}
              disabled={nuevoConfirm.enviando}
            >
              Cancelar
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
