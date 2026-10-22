// frontend/src/api.js
// Solo ingreso/salida de vehículos. Sin autenticación JWT por ahora.
// Define VITE_API_URL en frontend/.env, por ejemplo: VITE_API_URL=http://localhost:3000/api
import { normalizarPlaca } from "./validators/placa";

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
    // Se adjunta el status HTTP al error para que el frontend pueda
    // diferenciar casos (ej. 404 = placa no registrada) sin parsear el texto.
    const error = new Error(data.error || "Error en la solicitud");
    error.status = res.status;
    throw error;
  }
  return data;
}

// Consulta de vehículo por placa.
// Se normaliza igual que en el backend (mayúsculas, sin espacios y sin
// guiones) para que "car-001" y "CAR001" consulten el mismo vehículo.
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
