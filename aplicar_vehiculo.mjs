import { readFileSync, writeFileSync } from "fs";

const p = "c:/Users/Lenovo/Documents/Auto_Colombia/backend/src/controllers/vehiculoController.js";
let t = readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const helper = readFileSync("c:/Users/Lenovo/Documents/Auto_Colombia/helper_vehiculo.inc", "utf8").replace(/\r\n/g, "\n");

// Reemplazar el bloque de buscarVehiculoPorPlaca (hasta antes de buscarVehiculosPorPropietario)
const iniPlaca = t.indexOf("export const buscarVehiculoPorPlaca = async (req, res) => {");
if (iniPlaca < 0) throw new Error("iniPlaca no encontrado");
const marcaFinPlaca = "};\n\n/**\n * @function buscarVehiculosPorPropietario";
const finPlaca = t.indexOf(marcaFinPlaca, iniPlaca);
if (finPlaca < 0) throw new Error("finPlaca no encontrado");
const bloquePlacaViejo = t.slice(iniPlaca, finPlaca + marcaFinPlaca.length);

t = t.replace(bloquePlacaViejo, helper);

// Actualizar export default: agregar buscarVehiculosPorDocumento
const oldExport = `  buscarVehiculoPorPlaca,\n  buscarVehiculosPorPropietario,`;
const newExport = `  buscarVehiculoPorPlaca,\n  buscarVehiculosPorDocumento,\n  buscarVehiculosPorPropietario,`;
if (!t.includes(oldExport)) throw new Error("oldExport no encontrado");
t = t.replace(oldExport, newExport);

writeFileSync(p, t, "utf8");
console.log("vehiculoController.js actualizado OK");
