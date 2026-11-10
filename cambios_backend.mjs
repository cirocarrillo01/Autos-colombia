import { readFileSync, writeFileSync } from "fs";

// ===== movimientoController.js =====
const p1 = "c:/Users/Lenovo/Documents/Auto_Colombia/backend/src/controllers/movimientoController.js";
let t1 = readFileSync(p1, "utf8");

// 1a. Reemplazar validación de mensualidad en registrarEntrada
const old1a = `    // Validar vigencia de mensualidad usando utilidad centralizada
    const [mensualidadRows] = await conn.query(SQL_ULTIMA_MENSUALIDAD, [v.id_vehiculo]);
    const mensualidad = mensualidadRows[0];
    if (!mensualidad) {
      throw new ErrorNegocio(403, MSG.SIN_MENSUALIDAD);
    }`;
const new1a = `    // Vigencia: fecha_inicio <= hoy <= fecha_fin
    const [mensualidad] = await conn.query(SQL_ULTIMA_MENSUALIDAD, [
      v.id_vehiculo,
    ]);
    if (!mensualidad.length) {
      throw new ErrorNegocio(403, "El vehículo no tiene mensualidad activa");
    }
    if (!mensualidad[0].vigente) {
      throw new ErrorNegocio(403, "La mensualidad del vehículo está en mora");
    }`;
if (!t1.includes(old1a)) throw new Error("old1a no encontrado");
t1 = t1.replace(old1a, new1a);

// 1b. Eliminar bloque fechaCheck (regex tolera acento en comentario)
t1 = t1.replace(
  /    \/\/ Validar fechas espec[\u00c3\u00a9]ficamente para el mensaje de error\n    const \[fechaCheck\] = await conn.query\(\n      \`SELECT \(fecha_inicio > DATE\(UTC_TIMESTAMP\(\) - INTERVAL 5 HOUR\)\) AS pendiente\n       FROM mensualidades WHERE id_vehiculo = \? AND estado = 'activa' ORDER BY fecha_fin DESC LIMIT 1\`,\n      \[v\.id_vehiculo\]\n    \\);\n\n/,
  ""
);

// 1c. Eliminar if (!mensualidad.vigente) antiguo
t1 = t1.replace(
  /    if \(!mensualidad\.vigente\) \{\n      throw new ErrorNegocio\(403, fechaCheck\[0\]\.pendiente \? MSG\.MENSUALIDAD_PENDIENTE : MSG\.MENSUALIDAD_MORA\);\n    \}\n\n/,
  ""
);

// 1d. Cambiar error 400 de celda ocupada a 409 MSG.CELDA_NO_DISPONIBLE (tolerar acento)
t1 = t1.replace(
  /    if \(ocupada\.length > 0\)\n      throw new ErrorNegocio\(400, "La celda ya est.\u003fa ocupada"\);/,
  `    if (ocupada.length > 0)\n      throw new ErrorNegocio(409, MSG.CELDA_NO_DISPONIBLE);`
);

// 1e. Agregar FOR UPDATE a consulta de celdas en reubicacion
const old1e = `    const [celdas] = await conn.query(
      \`SELECT id_celda, codigo FROM celdas
       WHERE id_celda = ? AND activa = TRUE AND en_mantenimiento = FALSE
         AND id_tipo_vehiculo = ?
       LIMIT 1\`,
      [id_celda, acceso.id_tipo_vehiculo],
    );`;
const new1e = `    const [celdas] = await conn.query(
      \`SELECT id_celda, codigo FROM celdas
       WHERE id_celda = ? AND activa = TRUE AND en_mantenimiento = FALSE
         AND id_tipo_vehiculo = ?
       LIMIT 1 FOR UPDATE\`,
      [id_celda, acceso.id_tipo_vehiculo],
    );`;
if (!t1.includes(old1e)) throw new Error("old1e no encontrado");
t1 = t1.replace(old1e, new1e);

// 1f. Agregar listarDentro al export default
const old1f = `  listarAccesos,\n};`;
const new1f = `  listarAccesos,\n  listarDentro,\n};`;
if (!t1.includes(old1f)) throw new Error("old1f no encontrado");
t1 = t1.replace(old1f, new1f);

writeFileSync(p1, t1, "utf8");
console.log("movimientoController.js actualizado");
