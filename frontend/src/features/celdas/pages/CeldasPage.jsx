//frontend/src/features/celdas/pages/CeldasPage.jsx
// Gestión completa de celdas (RF3): lista, bloques, mantenimiento, reubicación, CRUD.

import { useCallback, useEffect, useState } from "react";
import {
  listarCeldas,
  celdasPorBloque,
  listarTiposVehiculo,
  crearCelda,
  editarTipoCelda,
  cambiarEstadoCelda,
  eliminarCelda,
  obtenerCeldasDisponibles,
  listarAccesos,
  reubicarVehiculo,
  resumenCeldas,
} from "../../../services/api";
import { usePolling } from "../../../hooks/usePolling";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import "../../../pages/Gestion.css";

import ResumenCeldas from "../../../Components/ResumenCeldas.jsx";

const ESTADOS = ["libre", "ocupada", "en mantenimiento", "inactiva"];
const LIMITE = 10;
const slug = (s) => String(s ?? "").replace(/\s/g, "-");

/**
 * Devuelve el tipo(s) de vehículo presentes en un bloque.
 * @param {Array} celdas 
 * @returns {string}
 */
const tipoBloque = (celdas = []) => {
  const tipos = [...new Set(celdas.map((c) => c.tipo).filter(Boolean))];
  if (tipos.length === 0) return "";
  if (tipos.length === 1) return tipos[0];
  return `Mixto (${tipos.join(" / ")})`;
};

const PRESETS_MANTENIMIENTO = [
  { label: "15 min", horas: 0, minutos: 15 },
  { label: "30 min", horas: 0, minutos: 30 },
  { label: "1 hora", horas: 1, minutos: 0 },
  { label: "2 horas", horas: 2, minutos: 0 },
  { label: "4 horas", horas: 4, minutos: 0 },
  { label: "8 horas", horas: 8, minutos: 0 },
  { label: "1 día", horas: 24, minutos: 0 },
];

/**
 * Componente CeldasPage - Página principal de administración de celdas.
 * Vistas: Lista (tabla paginada + filtros) y Por Bloques (visual).
 * Acciones: Crear, Editar tipo, Mantenimiento (con duración), Activar/Inactivar,
 * Eliminar (solo libre y sin historial), Reubicar vehículo (Dialog).
 */
export default function CeldasPage() {
  const [vista, setVista] = useState("lista");
  const [tipos, setTipos] = useState([]);
  const [filtros, setFiltros] = useState({ tipo: "", bloque: "", estado: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [resumen, setResumen] = useState(null);
  const [msg, setMsg] = useState(null);
  const [bloques, setBloques] = useState([]);
  const [estadoAbierto, setEstadoAbierto] = useState(false);

  const [reubicando, setReubicando] = useState(null);
  const [celdasDisponibles, setCeldasDisponibles] = useState([]);
  const [celdaDestino, setCeldaDestino] = useState(null);
  const [cargandoReb, setCargandoReb] = useState(false);

  const [mantenimientoModal, setMantenimientoModal] = useState({
    abierto: false,
    celda: null,
    horas: 0,
    minutos: 30,
    error: "",
    enviando: false,
  });

  const [crearModal, setCrearModal] = useState({
    abierto: false,
    letra: "",
    numero: "",
    id_tipo_vehiculo: "",
    error: "",
    enviando: false,
  });

  const [eliminarModal, setEliminarModal] = useState({
    abierto: false,
    celda: null,
    enviando: false,
  });

  /**
   * Carga lista, bloques y resumen en paralelo.
   */
  const cargar = useCallback(async () => {
    try {
      const [lista, b, r] = await Promise.all([
        listarCeldas({ ...filtros, page, limit: LIMITE }),
        celdasPorBloque(),
        resumenCeldas(),
      ]);
      setData(lista);
      setBloques(b);
      setResumen(r);
    } catch (e) {
      setMsg({ tipo: "error", texto: e.message });
    }
  }, [filtros, page]);

  usePolling(cargar, 30000);

  useEffect(() => {
    listarTiposVehiculo()
      .then((t) => {
        setTipos(t);
        setCrearModal((m) => ({
          ...m,
          id_tipo_vehiculo:
            m.id_tipo_vehiculo || (t[0]?.id_tipo_vehiculo ?? ""),
        }));
      })
      .catch((e) => setMsg({ tipo: "error", texto: e.message }));
  }, []);

  /**
   * Ejecuta una acción asíncrona con mensaje de resultado.
   * @param {Function} fn 
   * @param {string} okTexto 
   * @param {"ok"|"error"} tipoOk 
   */
  const ejecutar = async (fn, okTexto, tipoOk = "ok") => {
    try {
      const r = await fn();
      setMsg({ tipo: tipoOk, texto: r?.mensaje ?? okTexto });
      cargar();
      return true;
    } catch (e) {
      setMsg({ tipo: "error", texto: e.message });
      return false;
    }
  };

  const abrirCrear = () => {
    setCrearModal({
      abierto: true,
      letra: "",
      numero: "",
      id_tipo_vehiculo: tipos[0]?.id_tipo_vehiculo ?? "",
      error: "",
      enviando: false,
    });
  };

  const cerrarCrear = () => {
    setCrearModal((m) => ({ ...m, abierto: false, error: "" }));
  };

  const confirmarCrear = async (e) => {
    if (e) e.preventDefault();
    if (!crearModal.letra.trim()) {
      setCrearModal((m) => ({ ...m, error: "El bloque es obligatorio" }));
      return;
    }
    if (!crearModal.numero || Number(crearModal.numero) < 1) {
      setCrearModal((m) => ({ ...m, error: "El número debe ser mayor o igual a 1" }));
      return;
    }
    if (!crearModal.id_tipo_vehiculo) {
      setCrearModal((m) => ({ ...m, error: "Selecciona un tipo de vehículo" }));
      return;
    }
    setCrearModal((m) => ({ ...m, enviando: true, error: "" }));
    try {
      await crearCelda({
        letra: crearModal.letra,
        numero: crearModal.numero,
        id_tipo_vehiculo: crearModal.id_tipo_vehiculo,
      });
      setMsg({ tipo: "ok", texto: "Celda creada" });
      cerrarCrear();
      cargar();
    } catch (err) {
      setCrearModal((m) => ({ ...m, error: err.message }));
    } finally {
      setCrearModal((m) => ({ ...m, enviando: false }));
    }
  };

  const abrirEliminar = (c) => {
    setEliminarModal({ abierto: true, celda: c, enviando: false });
  };

  const cerrarEliminar = () => {
    setEliminarModal({ abierto: false, celda: null, enviando: false });
  };

  const confirmarEliminar = async () => {
    if (!eliminarModal.celda) return;
    setEliminarModal((m) => ({ ...m, enviando: true }));
    try {
      await eliminarCelda(eliminarModal.celda.id_celda);
      setMsg({ tipo: "error", texto: "Celda eliminada correctamente" });
      cerrarEliminar();
      cargar();
    } catch (err) {
      setMsg({ tipo: "error", texto: err.message });
      setEliminarModal((m) => ({ ...m, enviando: false }));
    }
  };

  const cambiarTipo = (c) => {
    const otro = tipos.find((t) => t.id_tipo_vehiculo !== c.id_tipo_vehiculo);
    if (
      otro &&
      window.confirm(`¿Cambiar la celda ${c.codigo} a ${otro.nombre}?`)
    ) {
      ejecutar(
        () => editarTipoCelda(c.id_celda, otro.id_tipo_vehiculo),
        "Tipo actualizado",
      );
    }
  };

  const abrirMantenimiento = (c) => {
    setMantenimientoModal({
      abierto: true,
      celda: c,
      horas: 0,
      minutos: 30,
      error: "",
      enviando: false,
    });
  };

  const cerrarMantenimiento = () => {
    setMantenimientoModal((m) => ({ ...m, abierto: false, error: "" }));
  };

  const confirmarMantenimiento = async () => {
    const horas = Number(mantenimientoModal.horas) || 0;
    const minutos = Number(mantenimientoModal.minutos) || 0;
    const total = horas * 60 + minutos;
    if (!Number.isFinite(total) || total < 1) {
      setMantenimientoModal((m) => ({
        ...m,
        error: "La duración debe ser mayor a 0 minutos",
      }));
      return;
    }
    setMantenimientoModal((m) => ({ ...m, enviando: true, error: "" }));
    try {
      await cambiarEstadoCelda(mantenimientoModal.celda.id_celda, {
        en_mantenimiento: true,
        minutos_mantenimiento: total,
      });
      setMsg({ tipo: "ok", texto: "Celda en mantenimiento" });
      cerrarMantenimiento();
      cargar();
    } catch (e) {
      setMantenimientoModal((m) => ({ ...m, error: e.message }));
    } finally {
      setMantenimientoModal((m) => ({ ...m, enviando: false }));
    }
  };

  const toggleMantenimiento = (c) => {
    if (c.en_mantenimiento) {
      ejecutar(
        () => cambiarEstadoCelda(c.id_celda, { en_mantenimiento: false }),
        "Mantenimiento finalizado",
      );
      return;
    }
    abrirMantenimiento(c);
  };

  const abrirSelectorReubicacion = async (celda) => {
    try {
      const tipoCodigo = celda.tipo_codigo ?? celda.tipo;
      const disponibles = await obtenerCeldasDisponibles(tipoCodigo);
      setCeldasDisponibles(disponibles);
      setCeldaDestino(null);

      const accesos = await listarAccesos({
        estado: "adentro",
        celda: celda.codigo,
        limit: 1,
      });
      const idAcceso = accesos?.rows?.[0]?.id_acceso ?? null;
      if (!idAcceso) {
        setMsg({
          tipo: "error",
          texto: "No se encontró el acceso abierto para esta celda",
        });
        return;
      }

      setReubicando({
        id_acceso: idAcceso,
        id_celda: celda.id_celda,
        codigo: celda.codigo,
        placa: celda.placa_ocupante ?? "",
        id_tipo_vehiculo: celda.id_tipo_vehiculo,
        error: "",
      });
    } catch (e) {
      setMsg({ tipo: "error", texto: e.message });
    }
  };

  const cancelarReubicacion = () => {
    setReubicando(null);
    setCeldasDisponibles([]);
    setCeldaDestino(null);
  };

  const confirmarReubicacion = async () => {
    if (!celdaDestino || !reubicando) return;
    setCargandoReb(true);
    try {
      await reubicarVehiculo(reubicando.id_acceso, celdaDestino.id_celda);
      setMsg({
        tipo: "ok",
        texto: `Vehículo reubicado de ${reubicando.codigo} a ${celdaDestino.codigo}`,
      });
      cancelarReubicacion();
      await cargar();
    } catch (e) {
      setReubicando((r) => (r ? { ...r, error: e.message } : null));
    } finally {
      setCargandoReb(false);
    }
  };

  const filtrar = (campo) => (e) => {
    setPage(1);
    setFiltros({ ...filtros, [campo]: e.target.value });
  };

  const paginas = Math.max(Math.ceil(data.total / LIMITE), 1);

  const minutosTotales =
    (Number(mantenimientoModal.horas) || 0) * 60 +
    (Number(mantenimientoModal.minutos) || 0);

  return (
    <div className="Page">
      <h2>Celdas</h2>
      {msg && <p className={`Msg Msg-${msg.tipo}`}>{msg.texto}</p>}

      <div className="Toolbar">
        <button
          className={`Btn ${vista === "lista" ? "Btn--primary" : ""}`}
          onClick={() => setVista("lista")}
        >
          Lista
        </button>
        <button
          className={`Btn ${vista === "bloques" ? "Btn--primary" : ""}`}
          onClick={() => setVista("bloques")}
        >
          Por bloques
        </button>
        {vista === "lista" && (
          <>
            <select
              className="Select"
              value={filtros.tipo}
              onChange={filtrar("tipo")}
            >
              <option value="">Todos los tipos</option>
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
            </select>
            <input
              className="Input"
              placeholder="Bloque"
              maxLength={1}
              style={{ width: 90 }}
              value={filtros.bloque}
              onChange={filtrar("bloque")}
            />
            <select
              className="Select"
              value={filtros.estado}
              onChange={filtrar("estado")}
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        )}
        <button
          className="Btn Btn--primary"
          onClick={() => setEstadoAbierto(true)}
        >
          <span style={{ fontWeight: 600 }}>Estado actual</span>
        </button>
        <button
          className="Btn Btn--primary"
          onClick={abrirCrear}
          style={{ marginLeft: "auto" }}
        >
          Crear celda
        </button>
      </div>

      {/* ── Dialog: Estado actual ───────────────────────────────────── */}
      <Dialog
        open={estadoAbierto}
        onClose={() => setEstadoAbierto(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Estado actual de las celdas</DialogTitle>
        <DialogContent dividers>
          {resumen ? (
            <ResumenCeldas resumen={resumen} />
          ) : (
            <p style={{ color: "#9e9e9e", margin: 0 }}>Cargando resumen…</p>
          )}
          <p
            style={{
              marginTop: 16,
              marginBottom: 0,
              color: "#9e9e9e",
              fontSize: "0.8rem",
              textAlign: "right",
            }}
          >
            Se actualiza automáticamente cada 30 s.
          </p>
        </DialogContent>
        <DialogActions>
          <button type="button" className="Btn Btn--primary" onClick={() => setEstadoAbierto(false)}>
            Cerrar
          </button>
        </DialogActions>
      </Dialog>

      {vista === "bloques" ? (
        <div className="Bloques">
          {bloques.map((b) => {
            const tipo = tipoBloque(b.celdas);
            return (
              <div className="Bloque" key={b.bloque}>
                <h4>
                  Bloque {b.bloque}
                  {tipo ? ` - ${tipo}` : ""}
                </h4>
                <div className="Bloque-celdas">
                  {b.celdas.map((c) => (
                    <span
                      key={c.id_celda}
                      className={`CeldaBloque CeldaBloque--${slug(c.estado)}`}
                      title={`${c.codigo} · ${c.tipo} · ${c.estado}`}
                    >
                      {c.codigo}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="Card Tabla-wrap">
          <table className="Tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th style={{ width: "180px" }}>Estado</th>
                <th>Vehículo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={5}>Sin resultados</td>
                </tr>
              )}
              {data.rows.map((c) => (
                <tr key={c.id_celda}>
                  <td>{c.codigo}</td>
                  <td>{c.tipo}</td>
                  <td style={{ width: "180px" }}>
                    <span className={`Badge Badge--${slug(c.estado)}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td>{c.placa_ocupante ?? c.placa_asignada ?? "—"}</td>
                  <td>
                    <div className="Tabla-acciones">
                      <button
                        className="Btn Btn--sm"
                        onClick={() => toggleMantenimiento(c)}
                        disabled={c.estado === "ocupada"}
                      >
                        {c.en_mantenimiento
                          ? "Quitar mantenimiento"
                          : "Mantenimiento"}
                      </button>
                      <button
                        className={`Btn Btn--sm ${
                          c.activa ? "Btn--danger" : "Btn--success"
                        }`}
                        style={{ minWidth: 110 }}
                        onClick={() => {
                          const inactivando = c.activa;
                          return ejecutar(
                            () =>
                              cambiarEstadoCelda(c.id_celda, {
                                activa: !c.activa,
                              }),
                            inactivando ? "Celda inactivada" : "Celda activada",
                            inactivando ? "error" : "ok",
                          );
                        }}
                      >
                        {c.activa ? "Inactivar" : "Activar"}
                      </button>
                      {c.estado !== "asignada" && c.estado !== "ocupada" && (
                        <button
                          className="Btn Btn--sm"
                          style={{ minWidth: 115 }}
                          onClick={() => cambiarTipo(c)}
                        >
                          Cambiar tipo
                        </button>
                      )}
                      {c.estado === "libre" && (
                        <button
                          className="Btn Btn--sm Btn--danger"
                          onClick={() => abrirEliminar(c)}
                        >
                          Eliminar
                        </button>
                      )}
                      {c.estado === "ocupada" && (
                        <button
                          className="Btn Btn--sm"
                          style={{ minWidth: 115 }}
                          title="Reubicar vehículo"
                          onClick={() => abrirSelectorReubicacion(c)}
                        >
                          Reubicar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="Paginacion">
            <button
              className="Btn Btn--sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {paginas} ({data.total} celdas)
            </span>
            <button
              className="Btn Btn--sm"
              disabled={page >= paginas}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* ── Dialog: Crear celda ───────────────────────────────────────── */}
      <Dialog
        open={crearModal.abierto}
        onClose={cerrarCrear}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Nueva celda</DialogTitle>
        <form onSubmit={confirmarCrear}>
          <DialogContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label
                  htmlFor="nueva-letra"
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  Bloque (A-Z)
                </label>
                <input
                  id="nueva-letra"
                  className="Input"
                  placeholder="Ej. A"
                  maxLength={1}
                  value={crearModal.letra}
                  onChange={(e) =>
                    setCrearModal((m) => ({
                      ...m,
                      letra: e.target.value.toUpperCase(),
                      error: "",
                    }))
                  }
                  style={{ width: "100%" }}
                  disabled={crearModal.enviando}
                  autoFocus
                />
              </div>
              <div>
                <label
                  htmlFor="nueva-numero"
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  Número
                </label>
                <input
                  id="nueva-numero"
                  className="Input"
                  type="number"
                  min={1}
                  placeholder="Ej. 5"
                  value={crearModal.numero}
                  onChange={(e) =>
                    setCrearModal((m) => ({
                      ...m,
                      numero: e.target.value,
                      error: "",
                    }))
                  }
                  style={{ width: "100%" }}
                  disabled={crearModal.enviando}
                />
              </div>
              <div>
                <label
                  htmlFor="nueva-tipo"
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  Tipo de vehículo
                </label>
                <select
                  id="nueva-tipo"
                  className="Select"
                  value={crearModal.id_tipo_vehiculo}
                  onChange={(e) =>
                    setCrearModal((m) => ({
                      ...m,
                      id_tipo_vehiculo: e.target.value,
                      error: "",
                    }))
                  }
                  style={{ width: "100%" }}
                  disabled={crearModal.enviando}
                >
                  {tipos.map((t) => (
                    <option key={t.id_tipo_vehiculo} value={t.id_tipo_vehiculo}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {crearModal.error && (
              <p className="Msg Msg-error" style={{ marginTop: 14 }}>
                {crearModal.error}
              </p>
            )}
          </DialogContent>
          <DialogActions>
            <button
              type="submit"
              className="Btn Btn--primary"
              disabled={crearModal.enviando}
            >
              {crearModal.enviando ? "Creando…" : "Crear"}
            </button>
            <button
              type="button"
              className="Btn"
              onClick={cerrarCrear}
              disabled={crearModal.enviando}
            >
              Cancelar
            </button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Dialog: Eliminar celda ────────────────────────────────────── */}
      <Dialog
        open={eliminarModal.abierto}
        onClose={cerrarEliminar}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Eliminar celda</DialogTitle>
        <DialogContent>
          <p style={{ marginTop: 0 }}>
            ¿Está seguro de eliminar la celda{" "}
            <strong>{eliminarModal.celda?.codigo}</strong>?
          </p>
          <p style={{ color: "#9e9e9e", fontSize: "0.85rem", margin: 0 }}>
            Esta acción no se puede deshacer. Solo se permite eliminar celdas
            libres sin historial de accesos.
          </p>
        </DialogContent>
        <DialogActions>
          <button
            type="button"
            className="Btn Btn--danger"
            onClick={confirmarEliminar}
            disabled={eliminarModal.enviando}
          >
            {eliminarModal.enviando ? "Eliminando…" : "Eliminar"}
          </button>
          <button
            type="button"
            className="Btn"
            onClick={cerrarEliminar}
            disabled={eliminarModal.enviando}
          >
            Cancelar
          </button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Reubicar vehículo ─────────────────────────────────── */}
      <Dialog
        open={Boolean(reubicando)}
        onClose={cancelarReubicacion}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Reubicar vehículo {reubicando?.placa || "(desconocido)"}
        </DialogTitle>
        <DialogContent>
          <p style={{ marginTop: 0 }}>
            Celda actual: <strong>{reubicando?.codigo}</strong>
          </p>

          <label
            htmlFor="reubicar-destino"
            style={{
              display: "block",
              marginTop: 8,
              marginBottom: 4,
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Celda destino
          </label>
          <select
            id="reubicar-destino"
            className="Select"
            value={celdaDestino?.id_celda ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              setCeldaDestino(
                celdasDisponibles.find((d) => d.id_celda === id) ?? null,
              );
              setReubicando((r) => (r ? { ...r, error: "" } : null));
            }}
            style={{ width: "100%" }}
            disabled={cargandoReb}
          >
            <option value="">Selecciona celda destino</option>
            {celdasDisponibles.map((d) => (
              <option key={d.id_celda} value={d.id_celda}>
                {d.codigo}
              </option>
            ))}
          </select>

          {celdasDisponibles.length === 0 && (
            <p className="Error" style={{ marginTop: 12 }}>
              No hay celdas disponibles de este tipo.
            </p>
          )}

          {reubicando?.error && (
            <p className="Msg Msg-error" style={{ marginTop: 14 }}>
              {reubicando.error}
            </p>
          )}
        </DialogContent>
        <DialogActions>
          <button
            type="button"
            className="Btn Btn--primary"
            onClick={confirmarReubicacion}
            disabled={!celdaDestino || cargandoReb}
          >
            {cargandoReb ? "Reubicando…" : "Confirmar"}
          </button>
          <button
            type="button"
            className="Btn"
            onClick={cancelarReubicacion}
            disabled={cargandoReb}
          >
            Cancelar
          </button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Mantenimiento ─────────────────────────────────────── */}
      <Dialog
        open={mantenimientoModal.abierto}
        onClose={cerrarMantenimiento}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Mantenimiento de la celda {mantenimientoModal.celda?.codigo}
        </DialogTitle>
        <DialogContent>
          <p style={{ marginTop: 0 }}>
            Indique cuánto tiempo estará fuera de servicio esta celda.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
              marginTop: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <label
                htmlFor="mant-horas"
                style={{
                  display: "block",
                  marginBottom: 4,
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                Horas
              </label>
              <input
                id="mant-horas"
                className="Input"
                type="number"
                min={0}
                max={168}
                value={mantenimientoModal.horas}
                onChange={(e) =>
                  setMantenimientoModal((m) => ({
                    ...m,
                    horas: e.target.value,
                    error: "",
                  }))
                }
                style={{ width: "100%" }}
                disabled={mantenimientoModal.enviando}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="mant-minutos"
                style={{
                  display: "block",
                  marginBottom: 4,
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                Minutos
              </label>
              <input
                id="mant-minutos"
                className="Input"
                type="number"
                min={0}
                max={59}
                value={mantenimientoModal.minutos}
                onChange={(e) =>
                  setMantenimientoModal((m) => ({
                    ...m,
                    minutos: e.target.value,
                    error: "",
                  }))
                }
                style={{ width: "100%" }}
                disabled={mantenimientoModal.enviando}
              />
            </div>
          </div>

          <p
            style={{
              color: "#9e9e9e",
              fontSize: "0.85rem",
              margin: "10px 0 4px",
            }}
          >
            Atajos rápidos:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRESETS_MANTENIMIENTO.map((p) => (
              <button
                key={p.label}
                type="button"
                className="Btn Btn--sm"
                onClick={() =>
                  setMantenimientoModal((m) => ({
                    ...m,
                    horas: p.horas,
                    minutos: p.minutos,
                    error: "",
                  }))
                }
                disabled={mantenimientoModal.enviando}
              >
                {p.label}
              </button>
            ))}
          </div>

          {minutosTotales > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                background: "#e8f5e9",
                border: "1px solid #a5d6a7",
                borderRadius: 6,
                color: "#2e7d32",
                fontSize: "0.85rem",
              }}
            >
              <strong>Se liberará:</strong>{" "}
              {(() => {
                const ahora = Date.now();
                const fin = new Date(ahora + minutosTotales * 60 * 1000);
                return (
                  <>
                    {fin.toLocaleDateString("es-CO", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    a las{" "}
                    {fin.toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ({minutosTotales} min en total)
                  </>
                );
              })()}
            </div>
          )}

          {mantenimientoModal.error && (
            <p className="Msg Msg-error" style={{ marginTop: 14 }}>
              {mantenimientoModal.error}
            </p>
          )}
        </DialogContent>
        <DialogActions>
          <button
            type="button"
            className="Btn Btn--primary"
            onClick={confirmarMantenimiento}
            disabled={mantenimientoModal.enviando || minutosTotales < 1}
          >
            {mantenimientoModal.enviando ? "Aplicando…" : "Aplicar"}
          </button>
          <button
            type="button"
            className="Btn"
            onClick={cerrarMantenimiento}
            disabled={mantenimientoModal.enviando}
          >
            Cancelar
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}