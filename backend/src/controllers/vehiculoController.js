// Gestión de vehículos y propietarios (RF2).
import { query } from "../config/db.js";
import { validarPlaca } from "../validators/placa.js";
import {
  SQL_ULTIMA_MENSUALIDAD,
  estadoMensualidad,
} from "../utils/mensualidad.js";
import { paginar, likeSeguro } from "../utils/consultas.js";
import { aBooleano } from "../utils/errores.js";
import { VALID_TIPOS_DOCUMENTO } from "../middleware/validation.js";

const SELECT_VEHICULO = `
  SELECT v.id_vehiculo, v.placa, v.propietario_nombre, v.propietario_documento, v.modelo, v.nombre_modelo, v.color,
         tv.codigo AS tipo_codigo, tv.nombre AS tipo, tv.tarifa_mensual
  FROM vehiculos v INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo`;

const dentro = async (idVehiculo) =>
  (
    await query(
      `SELECT id_acceso FROM accesos_vehiculos WHERE id_vehiculo = ? AND fecha_salida IS NULL LIMIT 1`,
      [idVehiculo],
    )
  )[0];

async function armarRespuestaVehiculo(v) {
  const [acceso, [mens]] = await Promise.all([
    dentro(v.id_vehiculo),
    query(SQL_ULTIMA_MENSUALIDAD, [v.id_vehiculo]).then((r) => [r[0]]),
  ]);
  return {
    id: v.id_vehiculo,
    placa: v.placa,
    estado: acceso ? "Dentro" : "Fuera",
    mensualidad: v.tarifa_mensual,
    tipo: v.tipo,
    tipoCodigo: v.tipo_codigo,
    modelo: v.modelo ?? "",
    nombreModelo: v.nombre_modelo ?? "",
    color: v.color ?? "",
    usuario: v.propietario_nombre,
    documento: v.propietario_documento,
    estadoMensualidad: estadoMensualidad(mens),
  };
}

const error500 = (res, err, msg) => {
  console.error(err);
  res.status(500).json({ error: msg });
};

export const buscarVehiculoPorPlaca = async (req, res) => {
  try {
    const f = validarPlaca(req.params.placa);
    if (!f.valida) return res.status(400).json({ error: f.error });
    const [v] = await query(
      `${SELECT_VEHICULO} WHERE v.placa = ? AND v.activo = TRUE LIMIT 1`,
      [f.placa],
    );
    if (!v) return res.status(404).json({ error: "Vehículo no encontrado" });
    res.json(await armarRespuestaVehiculo(v));
  } catch (err) {
    error500(res, err, "Error al consultar el vehículo");
  }
};

/** Vehículos activos de un propietario. Reemplaza a buscarVehiculosPorPropietario (duplicado, sin uso en el front). */
export const buscarVehiculosPorDocumento = async (req, res) => {
  try {
    const documento = String(req.params.documento ?? "").trim();
    if (!/^[A-Za-z0-9]{5,20}$/.test(documento))
      return res
        .status(400)
        .json({
          error:
            "El documento debe tener entre 5 y 20 caracteres alfanuméricos",
        });
    const vehiculos = await query(
      `${SELECT_VEHICULO} WHERE v.propietario_documento = ? AND v.activo = TRUE ORDER BY v.placa`,
      [documento],
    );
    if (!vehiculos.length)
      return res
        .status(404)
        .json({ error: "No hay vehículos registrados con ese documento" });
    res.json(await Promise.all(vehiculos.map(armarRespuestaVehiculo)));
  } catch (err) {
    error500(res, err, "Error al consultar los vehículos");
  }
};

export const listarVehiculos = async (req, res) => {
  try {
    const { q, tipo, activo } = req.query;
    const { page, limit, offset } = paginar(req.query, { porDefecto: 10 });
    const conds = [],
      params = [];
    if (q) {
      conds.push(
        `(v.placa LIKE ? OR v.propietario_documento LIKE ? OR v.propietario_nombre LIKE ?)`,
      );
      const s = likeSeguro(q);
      params.push(s, s, s);
    }
    if (tipo === "carro" || tipo === "moto") {
      conds.push(`tv.codigo = ?`);
      params.push(tipo);
    }
    if (activo !== undefined) {
      const b = aBooleano(activo);
      if (b === null)
        return res
          .status(400)
          .json({ error: "El filtro activo debe ser true o false" });
      conds.push(`v.activo = ?`);
      params.push(b ? 1 : 0);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const FROM = `FROM vehiculos v INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo ${where}`;
    const rows = await query(
      `SELECT v.id_vehiculo, v.placa, v.color, v.modelo, v.nombre_modelo, v.propietario_nombre, v.propietario_tipo_documento,
              v.propietario_documento, v.propietario_telefono, v.propietario_email, v.activo, tv.nombre AS tipo, tv.codigo AS tipo_codigo
       ${FROM} ORDER BY v.fecha_registro DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [{ total }] = await query(`SELECT COUNT(*) AS total ${FROM}`, params);
    res.json({ rows, total: Number(total), page, limit });
  } catch (err) {
    error500(res, err, "Error al listar los vehículos");
  }
};

export const crearVehiculo = async (req, res) => {
  try {
    const b = req.body ?? {};
    const formato = validarPlaca(b.placa);
    if (!formato.valida) return res.status(400).json({ error: formato.error });
    const faltan = [
      "id_tipo_vehiculo",
      "color",
      "modelo",
      "nombre_modelo",
      "propietario_nombre",
      "propietario_documento",
    ].filter(
      (k) => b[k] === undefined || b[k] === null || String(b[k]).trim() === "",
    );
    if (faltan.length)
      return res
        .status(400)
        .json({ error: `Campos obligatorios faltantes: ${faltan.join(", ")}` });

    const tipoDoc = b.propietario_tipo_documento ?? "cc";
    if (!VALID_TIPOS_DOCUMENTO.includes(tipoDoc))
      return res
        .status(400)
        .json({ error: "Tipo de documento del propietario inválido" });

    const [tipo] = await query(
      `SELECT id_tipo_vehiculo, codigo FROM tipos_vehiculos WHERE id_tipo_vehiculo = ?`,
      [b.id_tipo_vehiculo],
    );
    if (!tipo)
      return res.status(400).json({ error: "Tipo de vehículo inválido" });
    const porTipo = validarPlaca(b.placa, tipo.codigo);
    if (!porTipo.valida) return res.status(400).json({ error: porTipo.error });

    // BUG CRÍTICO corregido: el INSERT tenía `NULL` literal para el email y solo 9 placeholders,
    // pero se pasaban 10 parámetros -> "Incorrect arguments" en TODA creación de vehículos. Y el email nunca se guardaba.
    const r = await query(
      `INSERT INTO vehiculos (id_tipo_vehiculo, placa, color, modelo, nombre_modelo, propietario_nombre,
         propietario_tipo_documento, propietario_documento, propietario_telefono, propietario_email, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        tipo.id_tipo_vehiculo,
        formato.placa,
        b.color,
        b.modelo,
        b.nombre_modelo,
        b.propietario_nombre,
        tipoDoc,
        b.propietario_documento,
        b.propietario_telefono ?? null,
        b.propietario_email ?? null,
      ],
    );
    res.status(201).json({ id_vehiculo: r.insertId, placa: formato.placa });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ error: "Ya existe un vehículo con esa placa" });
    error500(res, err, "Error al registrar el vehículo");
  }
};

const CAMPOS_EDITABLES = [
  "color",
  "modelo",
  "nombre_modelo",
  "propietario_nombre",
  "propietario_tipo_documento",
  "propietario_documento",
  "propietario_telefono",
  "propietario_email",
];

/** PUT: ya no acepta `activo` (permitía desactivar un vehículo que está dentro, saltándose la regla de PATCH /estado). */
export const actualizarVehiculo = async (req, res) => {
  try {
    const f = validarPlaca(req.params.placa);
    if (!f.valida) return res.status(400).json({ error: f.error });
    const [v] = await query(
      `SELECT id_vehiculo FROM vehiculos WHERE placa = ? LIMIT 1`,
      [f.placa],
    );
    if (!v) return res.status(404).json({ error: "Vehículo no encontrado" });

    const b = req.body ?? {};
    if (
      b.propietario_tipo_documento !== undefined &&
      !VALID_TIPOS_DOCUMENTO.includes(b.propietario_tipo_documento)
    ) {
      return res
        .status(400)
        .json({ error: "Tipo de documento del propietario inválido" });
    }
    const sets = [],
      params = [];
    for (const c of CAMPOS_EDITABLES)
      if (b[c] !== undefined && b[c] !== null) {
        sets.push(`${c} = ?`);
        params.push(b[c]);
      }
    if (!sets.length)
      return res.status(400).json({ error: "No hay campos para actualizar" });
    await query(
      `UPDATE vehiculos SET ${sets.join(", ")} WHERE id_vehiculo = ?`,
      [...params, v.id_vehiculo],
    );
    res.json({ mensaje: "Vehículo actualizado correctamente" });
  } catch (err) {
    error500(res, err, "Error al actualizar el vehículo");
  }
};

export const cambiarEstadoVehiculo = async (req, res) => {
  try {
    const f = validarPlaca(req.params.placa);
    if (!f.valida) return res.status(400).json({ error: f.error });
    // Antes cualquier valor distinto de false ("foo", 0...) ACTIVABA el vehículo.
    const activo = aBooleano(req.body?.activo);
    if (activo === null)
      return res
        .status(400)
        .json({ error: "El campo activo es obligatorio (true/false)" });

    const [v] = await query(
      `SELECT id_vehiculo FROM vehiculos WHERE placa = ? LIMIT 1`,
      [f.placa],
    );
    if (!v) return res.status(404).json({ error: "Vehículo no encontrado" });
    if (!activo && (await dentro(v.id_vehiculo))) {
      return res
        .status(400)
        .json({
          error:
            "No se puede desactivar un vehículo que está dentro del parqueadero",
        });
    }
    await query(`UPDATE vehiculos SET activo = ? WHERE id_vehiculo = ?`, [
      activo,
      v.id_vehiculo,
    ]);
    res.json({
      mensaje: `Vehículo ${activo ? "activado" : "desactivado"} correctamente`,
    });
  } catch (err) {
    error500(res, err, "Error al cambiar el estado del vehículo");
  }
};

const gone = (mensaje) => (_req, res) =>
  res.status(410).json({ error: mensaje });
export const asignarCeldaFija = gone(
  "La asignación de celdas fijas ya no está disponible.",
);
export const liberarCeldaFija = gone(
  "La liberación de celdas fijas ya no está disponible.",
);

export default {
  buscarVehiculoPorPlaca,
  buscarVehiculosPorDocumento,
  listarVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  cambiarEstadoVehiculo,
  asignarCeldaFija,
  liberarCeldaFija,
};
