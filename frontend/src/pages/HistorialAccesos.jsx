// backend/src/HistorialAccesos.jsx
import { useCallback, useEffect, useState } from "react";
import { listarAccesos } from "../services/api";
import "../pages/Gestion.css";

const LIMITE = 20;

function fmt(fecha) {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleString("es-CO");
}

export default function HistorialAccesos() {
  const [filtros, setFiltros] = useState({
    placa: "",
    celda: "",
    operador: "",
    estado: "",
    fecha_desde: "",
    fecha_hasta: "",
  });
  const [aplicados, setAplicados] = useState(filtros);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });

  const cargar = useCallback(async () => {
    try {
      setData(await listarAccesos({ ...aplicados, page, limit: LIMITE }));
    } catch (e) {
      console.error(e);
    }
  }, [aplicados, page]);

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
    const t = setTimeout(() => {
      setPage(1);
      setAplicados(filtros);
    }, 300);
    return () => clearTimeout(t);
  }, [filtros]);

  const buscar = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAplicados(filtros);
  };

  const limpiar = () => {
    setFiltros({
      placa: "",
      celda: "",
      operador: "",
      estado: "",
      fecha_desde: "",
      fecha_hasta: "",
    });
  };

  const paginas = Math.max(Math.ceil(data.total / LIMITE), 1);

  return (
    <div className="Page">
      <h2>Historial de accesos</h2>

      <form className="Toolbar" onSubmit={buscar}>
        <input
          className="Input"
          placeholder="Placa"
          value={filtros.placa}
          style={{ textTransform: "uppercase" }}
          onChange={(e) =>
            setFiltros({ ...filtros, placa: e.target.value.toUpperCase() })
          }
        />
        <input
          className="Input"
          placeholder="Celda"
          value={filtros.celda}
          style={{ textTransform: "uppercase" }}
          onChange={(e) =>
            setFiltros({ ...filtros, celda: e.target.value.toUpperCase() })
          }
        />
        <input
          className="Input"
          placeholder="Operador"
          value={filtros.operador}
          onChange={(e) => setFiltros({ ...filtros, operador: e.target.value })}
        />
        <select
          className="Select"
          value={filtros.estado}
          onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
        >
          <option value="">Todos</option>
          <option value="adentro">Adentro</option>
          <option value="fuera">Fuera</option>
        </select>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            className="Input"
            type="date"
            value={filtros.fecha_desde}
            onChange={(e) =>
              setFiltros({ ...filtros, fecha_desde: e.target.value })
            }
          />
          <input
            className="Input"
            type="date"
            value={filtros.fecha_hasta}
            onChange={(e) =>
              setFiltros({ ...filtros, fecha_hasta: e.target.value })
            }
          />
        </div>
        <button className="Btn Btn--primary" type="submit">
          Buscar
        </button>
        <button type="button" className="Btn" onClick={limpiar}>
          Limpiar
        </button>
      </form>

      <div className="Card Tabla-wrap">
        <table className="Tabla">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Propietario</th>
              <th>Celda</th>
              <th>Operador ingreso</th>
              <th>Fecha/hora ingreso</th>
              <th>Operador salida</th>
              <th>Fecha/hora salida</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={7}>Sin registros</td>
              </tr>
            )}
            {data.rows.map((a) => (
              <tr key={a.id_acceso}>
                <td>{a.placa}</td>
                <td>{a.propietario_nombre}</td>
                <td>{a.celda}</td>
                <td>
                  {a.operador_ingreso_nombres} {a.operador_ingreso_apellidos}
                </td>
                <td>{fmt(a.fecha_ingreso)}</td>
                <td>
                  {a.operador_salida_nombres
                    ? `${a.operador_salida_nombres} ${a.operador_salida_apellidos}`
                    : "-"}
                </td>
                <td>{fmt(a.fecha_salida)}</td>
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
            Pagina {page} de {paginas} ({data.total} registros)
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
    </div>
  );
}
