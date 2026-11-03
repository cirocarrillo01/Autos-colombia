// frontend/src/features/celdas/pages/OperatorCeldasPage.jsx
// El resumen (Total / Libres / Ocupadas / No disponibles) NO se muestra
// siempre en la página: se abre en un Dialog al pulsar "Estado actual".
import { useCallback, useState } from "react";
import {
  listarCeldas,
  celdasPorBloque,
  resumenCeldas,
} from "../../../services/api";
import { usePolling } from "../../../hooks/usePolling";
import ResumenCeldas from "../../../Components/ResumenCeldas.jsx";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import "../../../pages/Gestion.css";

const ESTADOS = ["libre", "ocupada", "en mantenimiento", "inactiva"];
const LIMITE = 10;
const slug = (s) => String(s ?? "").replace(/\s/g, "-");

// Devuelve el tipo (o tipos) de vehículo presentes en un bloque.
// Ej: "Carro", "Moto", "Mixto (Carro / Moto)" o "" si no hay celdas.
const tipoBloque = (celdas = []) => {
  const tipos = [...new Set(celdas.map((c) => c.tipo).filter(Boolean))];
  if (tipos.length === 0) return "";
  if (tipos.length === 1) return tipos[0];
  return `Mixto (${tipos.join(" / ")})`;
};

export default function OperatorCeldasPage() {
  const [vista, setVista] = useState("lista");
  const [filtros, setFiltros] = useState({ tipo: "", bloque: "", estado: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [bloques, setBloques] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [msg, setMsg] = useState(null);

  // Ventana flotante con el resumen (Total / Libres / Ocupadas / No disponibles)
  const [estadoAbierto, setEstadoAbierto] = useState(false);

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

  const filtrar = (campo) => (e) => {
    setPage(1);
    setFiltros({ ...filtros, [campo]: e.target.value });
  };

  const paginas = Math.max(Math.ceil(data.total / LIMITE), 1);

  return (
    <div className="Page">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Celdas</h2>
        <span
          className="Badge"
          style={{ background: "#e3f2fd", color: "#1565c0" }}
          title="El operador puede consultar pero no modificar celdas"
        >
          Solo lectura
        </span>
      </div>
      <p style={{ marginTop: 6, color: "#9e9e9e", fontSize: "0.85rem" }}>
        Consulta de disponibilidad. Para crear, mantener o reubicar celdas,
        solicita el apoyo de un administrador.
      </p>

      {msg && <p className={`Msg Msg-${msg.tipo}`}>{msg.texto}</p>}

      <div className="Toolbar">
        <button
          type="button"
          className={`Btn ${vista === "lista" ? "Btn--primary" : ""}`}
          onClick={() => setVista("lista")}
        >
          Lista
        </button>
        <button
          type="button"
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

        {/* Botón que abre la ventana flotante con el resumen */}
        <button
          type="button"
          className="Btn Btn--primary"
          style={{ marginLeft: "auto" }}
          onClick={() => setEstadoAbierto(true)}
        >
          Estado actual
        </button>
      </div>

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
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={4}>Sin resultados</td>
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
                  <td>{c.placa_ocupante ?? "—"}</td>
                </tr>
              ))}
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
              Página {page} de {paginas} ({data.total} celdas)
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
        </div>
      )}

      {/* ── Ventana flotante: Estado actual (resumen de celdas) ─────── */}
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
          <button
            type="button"
            className="Btn Btn--primary"
            onClick={() => setEstadoAbierto(false)}
          >
            Cerrar
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
