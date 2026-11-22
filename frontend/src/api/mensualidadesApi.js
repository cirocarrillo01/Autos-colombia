// frontend/src/api/mensualidadesApi.js
// Endpoints de mensualidades y pagos (RF05/RF06).
import { api } from "./client.js";

export const listarMensualidades = (params) =>
  api.get("/mensualidades", { params }).then((r) => r.data);

export const resumenMensualidades = () =>
  api.get("/mensualidades/resumen").then((r) => r.data);

export const proximosAVencer = () =>
  api.get("/mensualidades/proximos-vencer").then((r) => r.data);

export const detallePorPlaca = (placa) =>
  api
    .get(`/mensualidades/detalle/${encodeURIComponent(placa)}`)
    .then((r) => r.data);

export const previsualizarPago = (placa) =>
  api
    .get("/mensualidades/previsualizar", { params: { placa } })
    .then((r) => r.data);

export const registrarPago = (payload) =>
  api.post("/mensualidades/pago", payload).then((r) => r.data);

export const cancelarMensualidad = (placa) =>
  api.post("/mensualidades/cancelar", { placa }).then((r) => r.data);

export const eliminarVehiculo = (placa) =>
  api.post("/mensualidades/eliminar-vehiculo", { placa }).then((r) => r.data);

export const crearVehiculo = (payload) =>
  api.post("/vehiculos", payload).then((r) => r.data);

export const actualizarVehiculo = (placa, payload) =>
  api.put(`/vehiculos/${placa}`, payload).then((r) => r.data);

export const obtenerVehiculoRaw = (placa) =>
  api.get(`/vehiculos/${placa}/raw`).then((r) => r.data);
