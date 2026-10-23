// frontend/src/services/api.js
// Cliente HTTP del backend (solo ingreso/salida, sin autenticacion).
// La URL base se define en frontend/.env con VITE_API_URL.

import { normalizarPlaca } from "../validators/placa";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

async function pedir(url, opciones) {
  let res;
  try {
    res = await fetch(url, opciones);
  } catch {
    throw new Error("No se pudo conectar con el servidor");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Se adjunta el status HTTP para diferenciar casos (ej. 404 = placa no registrada)
    const error = new Error(data.error || "Error en la solicitud");
    error.status = res.status;
    throw error;
  }
  return data;
}

// Consulta de vehiculo por placa (normalizada igual que en el backend)
export const buscarVehiculo = (placa) =>
  pedir(`${API}/vehiculos/${encodeURIComponent(normalizarPlaca(placa))}`);

// Celdas libres; "tipo" opcional: 'carro' | 'moto'
export const obtenerCeldasDisponibles = (tipo) =>
  pedir(`${API}/celdas${tipo ? `?tipo=${encodeURIComponent(tipo)}` : ""}`);

// tipo: 'entrada' | 'salida'. En entrada, "celda" es el objeto { id_celda, codigo, ... }
export const registrarMovimiento = ({ placa, celda, tipo }) =>
  pedir(`${API}/movimientos/${tipo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      tipo === "salida" ? { placa } : { placa, id_celda: celda.id_celda },
    ),
  });
