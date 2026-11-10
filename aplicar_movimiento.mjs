import { readFileSync, writeFileSync } from "fs";

const p = "c:/Users/Lenovo/Documents/Auto_Colombia/backend/src/controllers/movimientoController.js";
let t = readFileSync(p, "utf8").replace(/\r\n/g, "\n");

// 1. Reemplazar validación de mensualidad en registrarEntrada
const old1 = `    // Validar vigencia de mensualidad usando utilidad centralizada
    const [mensualidadRows] = await conn.query(SQL_ULTIMA_MENSUALIDAD, [v.id_vehiculo]);
    const mensualidad = mensualidadRows[0];
    if (!mensualidad) {
      throw new ErrorNegocio(403, MSG.SIN_MENSUALIDAD);
    }`;
const new1 = `    // Vigencia: fecha_inicio <= hoy <= fecha_fin
    const [mensualidad] = await conn.query(SQL_ULTIMA_MENSUALIDAD, [
      v.id_vehiculo,
    ]);
    if (!mensualidad.length) {
      throw new ErrorNegocio(403, "El vehículo no tiene mensualidad activa");
    }
    if (!mensualidad[0].vigente) {
      throw new ErrorNegocio(403, "La mensualidad del vehículo está en mora");
    }`;
if (!t.includes(old1)) throw new Error("old1 no encontrado");
t = t.replace(old1, new1);

// 2. Eliminar bloque fechaCheck: desde "    const [fechaCheck] = await conn.query(" hasta "    );\n\n" que le sigue
const ini2 = t.indexOf("    const [fechaCheck] = await conn.query(");
if (ini2 < 0) throw new Error("ini2 no encontrado");
const marca2 = "    );\n\n";
const fin2 = t.indexOf(marca2, ini2);
if (fin2 < 0) throw new Error("fin2 no encontrado");
t = t.slice(0, ini2) + t.slice(fin2 + marca2.length);

// 3. Eliminar if (!mensualidad.vigente) antiguo: desde "    if (!mensualidad.vigente) {" hasta "    }\n\n"
const ini3 = t.indexOf("    if (!mensualidad.vigente) {");
if (ini3 < 0) throw new Error("ini3 no encontrado");
const marca3 = "    }\n\n";
const fin3 = t.indexOf(marca3, ini3);
if (fin3 < 0) throw new Error("fin3 no encontrado");
t = t.slice(0, ini3) + t.slice(fin3 + marca3.length);

// 4. Cambiar error 400 de celda ocupada a 409
const old4 = `throw new ErrorNegocio(400, "La celda ya está ocupada");`;
const new4 = `throw new ErrorNegocio(409, MSG.CELDA_NO_DISPONIBLE);`;
if (!t.includes(old4)) throw new Error("old4 no encontrado");
t = t.replace(old4, new4);

// 5. Agregar FOR UPDATE a consulta de celdas en reubicacion
const old5 = `       LIMIT 1\`,
      [id_celda, acceso.id_tipo_vehiculo],
    );`;
const new5 = `       LIMIT 1 FOR UPDATE\`,
      [id_celda, acceso.id_tipo_vehiculo],
    );`;
if (!t.includes(old5)) throw new Error("old5 no encontrado");
t = t.replace(old5, new5);

// 6. Agregar listarDentro al export default
const old6 = `  listarAccesos,\n};`;
const new6 = `  listarAccesos,\n  listarDentro,\n};`;
if (!t.includes(old6)) throw new Error("old6 no encontrado");
t = t.replace(old6, new6);

writeFileSync(p, t, "utf8");
console.log("movimientoController.js actualizado OK");
