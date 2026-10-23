// backend/src/controllers/vehiculoController.js
// GET /api/vehiculos/:placa
// Devuelve lo que necesita la pantalla de ingreso/salida:
//   placa, estado ("Adentro" | "Fuera"), mensualidad (tarifa), tipo, tipoCodigo,
//   modelo (anio), nombreModelo, color, usuario (propietario) y
//   estadoMensualidad ("Al día" | "En mora" | "Sin mensualidad").
// "Adentro" se deriva de accesos_vehiculos con fecha_salida IS NULL.

import { query } from "../config/db.js";
import { validarPlaca } from "../validators/placa.js";

export const buscarVehiculoPorPlaca = async (req, res) => {
  try {
    const formato = validarPlaca(req.params.placa);
    if (!formato.valida) {
      return res.status(400).json({ error: formato.error });
    }

    const [v] = await query(
      `SELECT v.id_vehiculo, v.placa, v.propietario_nombre,
              v.modelo, v.nombre_modelo, v.color,
              tv.codigo AS tipo_codigo, tv.nombre AS tipo, tv.tarifa_mensual
       FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       WHERE v.placa = ? AND v.activo = TRUE
       LIMIT 1`,
      [formato.placa],
    );
    if (!v) return res.status(404).json({ error: "Vehículo no encontrado" });

    const [accesoAbierto] = await query(
      `SELECT id_acceso FROM accesos_vehiculos
       WHERE id_vehiculo = ? AND fecha_salida IS NULL LIMIT 1`,
      [v.id_vehiculo],
    );

    // Estado derivado: fecha_fin de la ultima mensualidad activa vs hoy
    const [mensualidad] = await query(
      `SELECT (fecha_fin >= CURRENT_DATE()) AS vigente
       FROM mensualidades
       WHERE id_vehiculo = ? AND estado = 'activa'
       ORDER BY fecha_fin DESC LIMIT 1`,
      [v.id_vehiculo],
    );

    let estadoMensualidad = "Sin mensualidad";
    if (mensualidad) {
      estadoMensualidad = mensualidad.vigente ? "Al día" : "En mora";
    }

    res.json({
      id: v.id_vehiculo,
      placa: v.placa,
      estado: accesoAbierto ? "Adentro" : "Fuera",
      mensualidad: v.tarifa_mensual,
      tipo: v.tipo,
      tipoCodigo: v.tipo_codigo,
      modelo: v.modelo ?? "",
      nombreModelo: v.nombre_modelo ?? "",
      color: v.color ?? "",
      usuario: v.propietario_nombre,
      estadoMensualidad,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar el vehículo" });
  }
};
