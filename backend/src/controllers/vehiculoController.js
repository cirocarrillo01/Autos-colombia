// backend/src/controllers/vehiculoController.js
// Gestión de vehículos y propietarios (RF2).
//   GET    /api/vehiculos              listar y buscar (placa, documento, nombre) con paginación
//   GET    /api/vehiculos/:placa       obtener vehículo por placa (ya existente)
//   POST   /api/vehiculos              registrar vehículo + propietario
//   PUT    /api/vehiculos/:placa       editar datos del vehículo y del propietario
//   PATCH  /api/vehiculos/:placa/estado desactivar vehículo (RF2.5: no si está dentro)
//   PUT    /api/vehiculos/:placa/celda  asignar o reasignar celda fija (RF3.5, RF3.6)
//   DELETE /api/vehiculos/:placa/celda  liberar la celda fija (RF3.6)

import { query } from "../config/db.js";
import { validarPlaca } from "../validators/placa.js";

/**
 * GET /api/vehiculos/:placa - Devuelve lo que necesita la pantalla de ingreso/salida.
 */
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

    // Estado derivado: fecha_fin vs HOY en Bogotá (UTC-5), consistente con
    // movimientoController. Así un vehículo no aparece "En mora" 5 horas
    // antes de que termine realmente su mensualidad en hora local.
    const [mensualidad] = await query(
      `SELECT (fecha_fin >= DATE(UTC_TIMESTAMP() - INTERVAL 5 HOUR)) AS vigente
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

/**
 * GET /api/vehiculos - Listar y buscar vehículos y propietarios.
 * Filtros: q (placa, documento o nombre), tipo, activo. Paginación.
 * RF2.3 - Consultar vehículos y propietarios por placa, documento o nombre.
 */
export const listarVehiculos = async (req, res) => {
  try {
    const { q, tipo, activo, page = 1, limit = 10 } = req.query;
    const p = Math.max(Number.parseInt(page, 10) || 1, 1);
    const l = Math.max(Math.min(Number.parseInt(limit, 10) || 10, 100), 1);
    const offset = (p - 1) * l;

    const conds = [];
    const params = [];

    if (q) {
      conds.push(
        `(v.placa LIKE ? OR v.propietario_documento LIKE ? OR v.propietario_nombre LIKE ?)`,
      );
      const s = `%${q}%`;
      params.push(s, s, s);
    }
    if (tipo === "carro" || tipo === "moto") {
      conds.push(
        `v.id_tipo_vehiculo = (SELECT id_tipo_vehiculo FROM tipos_vehiculos WHERE codigo = ? LIMIT 1)`,
      );
      params.push(tipo);
    }
    if (activo !== undefined) {
      conds.push(`v.activo = ?`);
      params.push(activo === "true" ? 1 : 0);
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const rows = await query(
      `SELECT v.id_vehiculo, v.placa, v.color, v.modelo, v.nombre_modelo,
              v.propietario_nombre, v.propietario_tipo_documento,
              v.propietario_documento, v.propietario_telefono,
              v.propietario_email, v.activo,
              tv.nombre AS tipo, tv.codigo AS tipo_codigo
       FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       ${where}
       ORDER BY v.fecha_registro DESC
       LIMIT ? OFFSET ?`,
      [...params, l, offset],
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM vehiculos v ${where}`,
      params,
    );

    res.json({
      rows,
      total: Number(countRows[0]?.total ?? 0),
      page: p,
      limit: l,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar los vehículos" });
  }
};

/**
 * POST /api/vehiculos - Registrar un vehículo con datos del propietario.
 * RF2.1 - placa, tipo, color, año, nombre modelo, propietario (nombre, tipo y número
 *         de documento, teléfono, correo).
 * RF2.2 - placa única y entre 5 y 8 caracteres (BD lo valida con CHECK y UNIQUE).
 */
export const crearVehiculo = async (req, res) => {
  try {
    const {
      id_tipo_vehiculo,
      placa,
      color,
      modelo,
      nombre_modelo,
      propietario_nombre,
      propietario_tipo_documento,
      propietario_documento,
      propietario_telefono,
      propietario_email,
    } = req.body ?? {};

    const formato = validarPlaca(placa);
    if (!formato.valida) {
      return res.status(400).json({ error: formato.error });
    }

    const obligatorios = [
      id_tipo_vehiculo,
      placa,
      color,
      modelo,
      nombre_modelo,
      propietario_nombre,
      propietario_documento,
    ];
    if (obligatorios.some((v) => v === undefined || v === null || v === "")) {
      return res.status(400).json({
        error:
          "Todos los campos obligatorios del vehículo y propietario son requeridos",
      });
    }

    // Verificar que el tipo de vehículo exista.
    const tipos = await query(
      `SELECT id_tipo_vehiculo, codigo FROM tipos_vehiculos WHERE id_tipo_vehiculo = ? LIMIT 1`,
      [id_tipo_vehiculo],
    );
    if (tipos.length === 0) {
      return res.status(400).json({ error: "Tipo de vehículo inválido" });
    }
    // La placa debe corresponder al tipo elegido
    const formatoTipo = validarPlaca(placa, tipos[0].codigo);
    if (!formatoTipo.valida) {
      return res.status(400).json({ error: formatoTipo.error });
    }

    const r = await query(
      `INSERT INTO vehiculos
         (id_tipo_vehiculo, placa, color, modelo, nombre_modelo,
          propietario_nombre, propietario_tipo_documento, propietario_documento,
          propietario_telefono, propietario_email, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, TRUE)`,
      [
        id_tipo_vehiculo,
        formato.placa,
        color,
        modelo,
        nombre_modelo,
        propietario_nombre,
        propietario_tipo_documento,
        propietario_documento,
        propietario_telefono ?? null,
        propietario_email ?? null,
      ],
    );
    res.status(201).json({ id_vehiculo: r.insertId, placa: formato.placa });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ya existe un vehículo con esa placa" });
    }
    console.error(err);
    res.status(500).json({ error: "Error al registrar el vehículo" });
  }
};

/**
 * PUT /api/vehiculos/:placa - Editar los datos del vehículo y del propietario.
 * RF2.4.
 */
export const actualizarVehiculo = async (req, res) => {
  try {
    const formato = validarPlaca(req.params.placa);
    if (!formato.valida) {
      return res.status(400).json({ error: formato.error });
    }

    const {
      color,
      modelo,
      nombre_modelo,
      propietario_nombre,
      propietario_tipo_documento,
      propietario_documento,
      propietario_telefono,
      propietario_email,
      activo,
    } = req.body ?? {};

    const [v] = await query(
      `SELECT id_vehiculo FROM vehiculos WHERE placa = ? LIMIT 1`,
      [formato.placa],
    );
    if (!v) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    const sets = [];
    const params = [];
    const mapeo = {
      color,
      modelo,
      nombre_modelo,
      propietario_nombre,
      propietario_tipo_documento,
      propietario_documento,
      propietario_telefono,
      propietario_email,
    };
    for (const [campo, valor] of Object.entries(mapeo)) {
      if (valor !== undefined && valor !== null) {
        sets.push(`${campo} = ?`);
        params.push(valor);
      }
    }
    if (activo !== undefined) {
      sets.push(`activo = ?`);
      params.push(activo === true || activo === "true" ? 1 : 0);
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    params.push(formato.placa);
    await query(
      `UPDATE vehiculos SET ${sets.join(", ")} WHERE placa = ?`,
      params,
    );
    res.json({ mensaje: "Vehículo actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el vehículo" });
  }
};

/**
 * PATCH /api/vehiculos/:placa/estado - Desactivar un vehículo (RF2.5).
 * RF2.5: No se permite si el vehículo está dentro del parqueadero.
 * Al desactivarse, se libera su celda fija.
 */
export const cambiarEstadoVehiculo = async (req, res) => {
  try {
    const formato = validarPlaca(req.params.placa);
    if (!formato.valida) {
      return res.status(400).json({ error: formato.error });
    }
    const { activo } = req.body ?? {};
    if (activo === undefined) {
      return res.status(400).json({ error: "El campo activo es obligatorio" });
    }

    const [v] = await query(
      `SELECT id_vehiculo FROM vehiculos WHERE placa = ? LIMIT 1`,
      [formato.placa],
    );
    if (!v) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    // RF2.5: no se permite desactivar si el vehículo está dentro del parqueadero.
    if (activo === false || activo === "false") {
      const [dentro] = await query(
        `SELECT id_acceso FROM accesos_vehiculos
         WHERE id_vehiculo = ? AND fecha_salida IS NULL LIMIT 1`,
        [v.id_vehiculo],
      );
      if (dentro) {
        return res.status(400).json({
          error:
            "No se puede desactivar un vehículo que está dentro del parqueadero",
        });
      }
      // Liberar la celda fija al desactivar.
      await query(`UPDATE vehiculos SET activo = FALSE WHERE placa = ?`, [
        formato.placa,
      ]);
      return res.json({
        mensaje: "Vehículo desactivado correctamente",
      });
    }

    await query(`UPDATE vehiculos SET activo = TRUE WHERE placa = ?`, [
      formato.placa,
    ]);
    res.json({ mensaje: "Vehículo activado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cambiar el estado del vehículo" });
  }
};

/**
 * PUT /api/vehiculos/:placa/celda
 * 410 Gone: la asignación de celdas fijas ya no existe en este sistema.
 * El parqueadero usa celdas rotativas; para mover un vehículo dentro del
 * parqueadero usa PATCH /api/movimientos/:id_acceso/celda (reubicación).
 */
export const asignarCeldaFija = (_req, res) => {
  res.status(410).json({
    error:
      "La asignación de celdas fijas ya no está disponible. Use PATCH /api/movimientos/:id_acceso/celda para reubicar un vehículo dentro del parqueadero.",
  });
};

/**
 * DELETE /api/vehiculos/:placa/celda
 * 410 Gone: ver asignarCeldaFija.
 */
export const liberarCeldaFija = (_req, res) => {
  res.status(410).json({
    error:
      "La liberación de celdas fijas ya no está disponible. Use PATCH /api/movimientos/:id_acceso/celda para reubicar un vehículo dentro del parqueadero.",
  });
};

export default {
  buscarVehiculoPorPlaca,
  listarVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  cambiarEstadoVehiculo,
  asignarCeldaFija,
  liberarCeldaFija,
};
