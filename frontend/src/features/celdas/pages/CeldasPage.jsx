// frontend/src/features/celdas/pages/CeldasPage.jsx

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
} from "../../../services/api";
import "../../../pages/Gestion.css";

const ESTADOS = ["libre", "ocupada", "en mantenimiento", "inactiva"];
const LIMITE = 10;
const slug = (s) => String(s ?? "").replace(/\s/g, "-");

export default function CeldasPage() {
  const [vista, setVista] = useState("lista"); // lista | bloques
  const [tipos, setTipos] = useState([]);
  const [filtros, setFiltros] = useState({ tipo: "", bloque: "", estado: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [bloques, setBloques] = useState([]);
  const [nueva, setNueva] = useState({
    letra: "",
    numero: "",
    id_tipo_vehiculo: "",
  });
  const [msg, setMsg] = useState(null);

  // Estado para reubicar el vehículo de una celda ocupada
  const [reubicando, setReubicando] = useState(null); // { id_acceso, id_celda, codigo, placa, id_tipo_vehiculo }
  const [celdasDisponibles, setCeldasDisponibles] = useState([]);
  const [celdaDestino, setCeldaDestino] = useState(null); // { id_celda, codigo }
  const [cargandoReb, setCargandoReb] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [lista, b] = await Promise.all([
        listarCeldas({ ...filtros, page, limit: LIMITE }),
        celdasPorBloque(),
      ]);
      setData(lista);
      setBloques(b);
    } catch (e) {
      setMsg({ tipo: "error", texto: e.message });
    }
  }, [filtros, page]);

  useEffect(() => {
    cargar();
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

  useEffect(() => {
    listarTiposVehiculo()
      .then((t) => {
        setTipos(t);
        setNueva((n) => ({
          ...n,
          id_tipo_vehiculo:
            n.id_tipo_vehiculo || (t[0]?.id_tipo_vehiculo ?? ""),
        }));
      })
      .catch((e) => setMsg({ tipo: "error", texto: e.message }));
  }, []);

  const ejecutar = async (fn, okTexto) => {
    try {
      const r = await fn();
      setMsg({ tipo: "ok", texto: r?.mensaje ?? okTexto });
      cargar();
      return true;
    } catch (e) {
      setMsg({ tipo: "error", texto: e.message });
      return false;
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    const ok = await ejecutar(() => crearCelda(nueva), "Celda creada");
    if (ok) setNueva({ ...nueva, letra: "", numero: "" });
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

  const eliminar = (c) => {
    if (window.confirm(`¿Eliminar la celda ${c.codigo}?`)) {
      ejecutar(() => eliminarCelda(c.id_celda), "Celda eliminada");
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
    const horas = window.prompt("Horas de mantenimiento:", "0");
    if (horas === null) return;
    const minutos = window.prompt("Minutos de mantenimiento:", "30");
    if (minutos === null) return;
    const total = Number(horas) * 60 + Number(minutos);
    if (!Number.isFinite(total) || total < 1) {
      setMsg({ tipo: "error", texto: "Duración inválida" });
      return;
    }
    ejecutar(
      () =>
        cambiarEstadoCelda(c.id_celda, {
          en_mantenimiento: true,
          minutos_mantenimiento: total,
        }),
      "Celda en mantenimiento",
    );
  };

  // Abre el selector de reubicación: consulta celdas libres del mismo tipo y
  // obtiene el id_acceso del vehículo que ocupa esa celda (desde el historial).
  const abrirSelectorReubicacion = async (celda) => {
    try {
      // Celdas libres del mismo tipo ("carro" | "moto")
      const tipoCodigo = celda.tipo_codigo ?? celda.tipo;
      const disponibles = await obtenerCeldasDisponibles(tipoCodigo);
      setCeldasDisponibles(disponibles);
      setCeldaDestino(null);

      // Necesitamos el id_acceso abierto de esta celda para reubicar.
      // listarCeldas solo devuelve placa_ocupante, así que lo consultamos
      // desde el historial filtrado por estado=adentro y celda.
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
      });
    } catch (e) {
      setMsg({ tipo: "error", texto: e.message });
    }
  };

  // Confirmar cambio de celda
  const confirmarReubicacion = async () => {
    if (!celdaDestino || !reubicando) return;
    if (
      !window.confirm(
        `¿Confirmar reubicar el vehículo ${reubicando.placa} de la celda ${reubicando.codigo} a la celda ${celdaDestino.codigo}?`,
      )
    ) {
      return;
    }
    setCargandoReb(true);
    try {
      await reubicarVehiculo(reubicando.id_acceso, celdaDestino.id_celda);
      setMsg({
        tipo: "ok",
        texto: `Vehículo reubicado de ${reubicando.codigo} a ${celdaDestino.codigo}`,
      });
      setReubicando(null);
      setCeldasDisponibles([]);
      setCeldaDestino(null);
      await cargar();
    } catch (e) {
      setMsg({ tipo: "error", texto: e.message });
    } finally {
      setCargandoReb(false);
    }
  };

  const cancelarReubicacion = () => {
    setReubicando(null);
    setCeldasDisponibles([]);
    setCeldaDestino(null);
  };

  const filtrar = (campo) => (e) => {
    setPage(1);
    setFiltros({ ...filtros, [campo]: e.target.value });
  };

  const paginas = Math.max(Math.ceil(data.total / LIMITE), 1);

  return (
    <div className="Page">
      <h2>Celdas</h2>
      {msg && <p className={`Msg Msg-${msg.tipo}`}>{msg.texto}</p>}

      <form className="Card" onSubmit={crear}>
        <h3 style={{ marginTop: 0 }}>Nueva celda</h3>
        <div className="Toolbar" style={{ marginBottom: 0 }}>
          <input
            className="Input"
            placeholder="Bloque (A-Z)"
            maxLength={1}
            required
            style={{ width: 110 }}
            value={nueva.letra}
            onChange={(e) =>
              setNueva({ ...nueva, letra: e.target.value.toUpperCase() })
            }
          />
          <input
            className="Input"
            type="number"
            min={1}
            placeholder="Número"
            required
            style={{ width: 110 }}
            value={nueva.numero}
            onChange={(e) => setNueva({ ...nueva, numero: e.target.value })}
          />
          <select
            className="Select"
            value={nueva.id_tipo_vehiculo}
            onChange={(e) =>
              setNueva({ ...nueva, id_tipo_vehiculo: e.target.value })
            }
          >
            {tipos.map((t) => (
              <option key={t.id_tipo_vehiculo} value={t.id_tipo_vehiculo}>
                {t.nombre}
              </option>
            ))}
          </select>
          <button className="Btn Btn--primary" type="submit">
            Crear
          </button>
        </div>
      </form>

      {/* Panel de reubicación: SOLO en vista Lista, justo debajo de "Nueva celda" */}
      {vista === "lista" && reubicando && (
        <div className="Card">
          <h3 style={{ marginTop: 0 }}>
            Reubicar vehículo {reubicando.placa || "(desconocido)"} (celda{" "}
            {reubicando.codigo})
          </h3>
          <div className="Toolbar">
            <select
              className="Select"
              value={celdaDestino?.id_celda ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                setCeldaDestino(
                  celdasDisponibles.find((d) => d.id_celda === id) ?? null,
                );
              }}
            >
              <option value="">Selecciona celda destino</option>
              {celdasDisponibles.map((d) => (
                <option key={d.id_celda} value={d.id_celda}>
                  {d.codigo}
                </option>
              ))}
            </select>
            <button
              className="Btn Btn--primary"
              disabled={!celdaDestino || cargandoReb}
              onClick={confirmarReubicacion}
            >
              {cargandoReb ? "Reubicando…" : "Confirmar"}
            </button>
            <button
              className="Btn"
              onClick={cancelarReubicacion}
              disabled={cargandoReb}
            >
              Cancelar
            </button>
          </div>
          {celdasDisponibles.length === 0 && (
            <p className="Error">No hay celdas disponibles de este tipo.</p>
          )}
        </div>
      )}

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
      </div>

      {vista === "bloques" ? (
        <div className="Bloques">
          {bloques.map((b) => (
            <div className="Bloque" key={b.bloque}>
              <h4>Bloque {b.bloque}</h4>
              <div className="Bloque-celdas">
                {b.celdas.map((c) => (
                  <span
                    key={c.id_celda}
                    className={`CeldaBloque CeldaBloque--${slug(c.estado)}`}
                    title={`${c.codigo} · ${c.estado}`}
                  >
                    {c.codigo}
                  </span>
                ))}
              </div>
            </div>
          ))}
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
                        onClick={() =>
                          ejecutar(
                            () =>
                              cambiarEstadoCelda(c.id_celda, {
                                activa: !c.activa,
                              }),
                            "Estado actualizado",
                          )
                        }
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
                          onClick={() => eliminar(c)}
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
                          reubicar
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
    </div>
  );
}
