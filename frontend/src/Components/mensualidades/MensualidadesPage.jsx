// frontend/src/pages/mensualidades/MensualidadesPage.jsx
// Página principal de mensualidades (RF06.3, RF06.4, RF06.9).
import React, { useCallback, useEffect, useRef, useState } from "react";
import ResumenCards from "../../Components/mensualidades/ResumenCards.jsx";
import FiltrosMensualidad from "../../Components/mensualidades/FiltrosMensualidad.jsx";
import TablaMensualidades from "../../Components/mensualidades/TablaMensualidades.jsx";
import PagoModal from "./PagoModal.jsx";
import RegistroVehiculoModal from "./RegistroVehiculoModal.jsx";
import DetalleModal from "./DetalleModal.jsx";
import ConfirmModal from "../../Components/mensualidades/ConfirmModal.jsx";
import { usePolling } from "../../hooks/usePolling";
import {
  listarMensualidades,
  resumenMensualidades,
  proximosAVencer,
  cancelarMensualidad,
  eliminarVehiculo,
  detallePorPlaca,
  obtenerVehiculoRaw,
} from "../../api/mensualidadesApi.js";
import { verifyPassword as verificarClaveUsuario } from "../../services/api.js";
import { apiError } from "../../api/client.js";
import { fecha } from "../../utils/formato.js";
import { useAuth } from "../../features/auth/context/AuthContext";
import "../../pages/Gestion.css";

const PAGE_SIZE = 10;

export default function MensualidadesPage() {
  const { usuario, rol } = useAuth();
  const puedeEscribir = !usuario
    ? false
    : ["administrador", "operador"].includes(rol);

  const [filtros, setFiltros] = useState({ q: "", estado: "", tipo: "" });
  const [aplicados, setAplicados] = useState(filtros);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, limit: PAGE_SIZE });
  const [resumen, setResumen] = useState([]);
  const [vencer, setVencer] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [placaPago, setPlacaPago] = useState(null);
  const [nuevoVehiculo, setNuevoVehiculo] = useState(false);
  const [detallePlaca, setDetallePlaca] = useState(null);
  const [vehiculoEdicion, setVehiculoEdicion] = useState(null);
  const [alerta, setAlerta] = useState(null);
  const [confirmCancelar, setConfirmCancelar] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const primeraCarga = useRef(true);

  const cargar = useCallback(async () => {
    if (primeraCarga.current) setCargando(true);
    setError("");
    try {
      const [lst, res, prox] = await Promise.all([
        listarMensualidades({ ...aplicados, page, limit: PAGE_SIZE }),
        resumenMensualidades(),
        proximosAVencer(),
      ]);
      setData(lst);
      setResumen(res.porTipo ?? []);
      setVencer(prox?.data ?? []);
    } catch (e) {
      setError(apiError(e, "Error al cargar mensualidades"));
    } finally {
      primeraCarga.current = false;
      setCargando(false);
    }
  }, [aplicados, page]);

  // RNF18: refresco cada 60s (solo si la pestaña está visible)
  usePolling(cargar, 60000);

  // RNF18: debounce 300ms en buscador
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setAplicados(filtros);
    }, 300);
    return () => clearTimeout(t);
  }, [filtros]);

  const limpiar = () => {
    const v = { q: "", estado: "", tipo: "" };
    setFiltros(v);
    setAplicados(v);
    setPage(1);
  };

  const confirmarCancelar = (r) => {
    setConfirmCancelar(r);
  };

  const ejecutarCancelar = async (res) => {
    const { placa } = confirmCancelar;
    const { clave } = res;
    setConfirmCancelar(null);
    try {
      // verificarClaveUsuario (pedir) devuelve directamente el objeto {status, ...} 
      // Si falla, el método `pedir` lanza una excepción (try/catch ya captura)
      await verificarClaveUsuario(clave);
      await cancelarMensualidad(placa);
      setAlerta({ texto: `Mensualidad de ${placa} cancelada.`, tipo: "success" });
      cargar();
    } catch (e) {
      if (e.status === 401) {
        setAlerta({ texto: "Contraseña incorrecta.", tipo: "err" });
      } else {
        setAlerta({ texto: apiError(e, "No se pudo cancelar"), tipo: "err" });
      }
    }
  };

  const confirmarEliminar = (r) => {
    setConfirmEliminar(r);
  };

  const ejecutarEliminar = async () => {
    const r = confirmEliminar;
    setConfirmEliminar(null);
    try {
      await eliminarVehiculo(r.placa);
      setAlerta({ texto: `Vehículo ${r.placa} eliminado.`, tipo: "success" });
      cargar();
    } catch (e) {
      setAlerta({ texto: apiError(e, "No se pudo eliminar"), tipo: "err" });
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Gestión de pagos</h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0" }}>
            Mensualidades, estados y pagos por vehículo
          </p>
        </div>
        <button onClick={() => setNuevoVehiculo(true)} style={{ padding: "8px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          + Nuevo Registro
        </button>
      </header>

      {alerta && (
        <div className={`mn-alert mn-alert--${alerta.tipo}`} role="alert" style={{ marginBottom: 16 }}>
          <span>{alerta.texto}</span>
        </div>
      )}

      <ResumenCards resumen={resumen} />

      {vencer.length > 0 && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <strong>Próximos a vencer:</strong>{" "}
          {vencer.map((v, i) => (
            <span key={v.id_mensualidad}>
              {v.placa} ({fecha(v.fecha_fin)})
              {i < vencer.length - 1 ? " · " : ""}
            </span>
          ))}
        </div>
      )}

      <FiltrosMensualidad
        filtros={filtros}
        onChange={setFiltros}
        onSubmit={limpiar}
        onLimpiar={limpiar}
      />

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {cargando ? (
        <p style={{ color: "#6b7280" }}>Cargando…</p>
      ) : (
        <TablaMensualidades
          rows={data.rows}
          puedeEscribir={puedeEscribir}
          onPagar={(r) => setPlacaPago(r.placa)}
          onCancelar={confirmarCancelar}
          onEliminar={confirmarEliminar}
          onDetalle={(r) => setDetallePlaca(r.placa)}
          onEditar={(r) => {
            obtenerVehiculoRaw(r.placa).then((v) => setVehiculoEdicion(v));
          }}
        />
      )}

      <div className="Paginacion">
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          {data.total} registros · página {page} de {totalPaginas}
        </span>
        <button
          className="Btn Btn--ghost Btn--sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Anterior
        </button>
        <button
          className="Btn Btn--ghost Btn--sm"
          onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
          disabled={page >= totalPaginas}
        >
          Siguiente
        </button>
      </div>

      {placaPago && (
        <PagoModal
          placa={placaPago}
          onClose={() => setPlacaPago(null)}
          onExito={(p) => {
            setAlerta({ texto: `Pago de ${p.placa} registrado.`, tipo: "success" });
            cargar();
          }}
        />
      )}

      {nuevoVehiculo && (
        <RegistroVehiculoModal
          onClose={() => setNuevoVehiculo(false)}
          onExito={() => {
            setAlerta({ texto: "Vehículo guardado.", tipo: "success" });
            cargar();
          }}
        />
      )}

      {detallePlaca && (
        <DetalleModal
          placa={detallePlaca}
          onClose={() => setDetallePlaca(null)}
        />
      )}

      {vehiculoEdicion && (
        <RegistroVehiculoModal
          vehiculoEdicion={vehiculoEdicion}
          onClose={() => setVehiculoEdicion(null)}
          onExito={() => { setVehiculoEdicion(null); cargar(); }}
        />
      )}

      <ConfirmModal
        abierto={Boolean(confirmCancelar)}
        titulo="Cancelar mensualidad"
        mensaje={confirmCancelar ? `¿Cancelar la mensualidad de ${confirmCancelar.placa}? Quedará "Sin mensualidad" y se liberará el cupo.` : ""}
        textoConfirmar="Aceptar"
        tipo="warning"
        requerirClave={true}
        onConfirmar={ejecutarCancelar}
        onCancelar={() => setConfirmCancelar(null)}
      />

      <ConfirmModal
        abierto={Boolean(confirmEliminar)}
        titulo="Eliminar vehículo"
        mensaje={confirmEliminar ? `¿Eliminar el vehículo ${confirmEliminar.placa}? Esta acción no se puede deshacer.` : ""}
        textoConfirmar="Eliminar"
        tipo="danger"
        onConfirmar={ejecutarEliminar}
        onCancelar={() => setConfirmEliminar(null)}
      />
    </div>
  );
}
