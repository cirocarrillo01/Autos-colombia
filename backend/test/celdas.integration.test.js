import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import {
  crearCelda,
  cambiarEstadoCelda,
  eliminarCelda,
} from "../src/controllers/celdaController.js";

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}

test("celdas: crear celda duplicada devuelve 409", async () => {
  const req = { body: { letra: "A", numero: 1, id_tipo_vehiculo: 1 } };
  const res = mockRes();
  await crearCelda(req, res);
  assert.equal(res.statusCode, 409);
});

test("celdas: crear mas del limite devuelve 400", async () => {
  const req = { body: { letra: "Z", numero: 1, id_tipo_vehiculo: 1 } };
  const res = mockRes();
  await crearCelda(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /No se pueden crear/);
});

test("celdas: poner en mantenimiento con duracion", async () => {
  const req = {
    params: { id: 1 },
    body: { en_mantenimiento: true, minutos_mantenimiento: 30 },
  };
  const res = mockRes();
  await cambiarEstadoCelda(req, res);
  assert.equal(res.statusCode, 200);

  const [rows] = await pool.query(
    "SELECT en_mantenimiento, mantenimiento_hasta FROM celdas WHERE id_celda = 1",
  );
  assert.equal(rows[0].en_mantenimiento, 1);
  assert.ok(rows[0].mantenimiento_hasta);
});

test("celdas: quitar mantenimiento limpia fecha", async () => {
  const req = { params: { id: 1 }, body: { en_mantenimiento: false } };
  const res = mockRes();
  await cambiarEstadoCelda(req, res);
  assert.equal(res.statusCode, 200);

  const [rows] = await pool.query(
    "SELECT en_mantenimiento, mantenimiento_hasta FROM celdas WHERE id_celda = 1",
  );
  assert.equal(rows[0].en_mantenimiento, 0);
  assert.equal(rows[0].mantenimiento_hasta, null);
});

test("celdas: inactivar y activar celda libre", async () => {
  const reqOff = { params: { id: 2 }, body: { activa: false } };
  const resOff = mockRes();
  await cambiarEstadoCelda(reqOff, resOff);
  assert.equal(resOff.statusCode, 200);

  const [rowsOff] = await pool.query("SELECT activa FROM celdas WHERE id_celda = 2");
  assert.equal(rowsOff[0].activa, 0);

  const reqOn = { params: { id: 2 }, body: { activa: true } };
  const resOn = mockRes();
  await cambiarEstadoCelda(reqOn, resOn);
  assert.equal(resOn.statusCode, 200);

  const [rowsOn] = await pool.query("SELECT activa FROM celdas WHERE id_celda = 2");
  assert.equal(rowsOn[0].activa, 1);
});

test("celdas: no se puede poner en mantenimiento si esta ocupada", async () => {
  // Crear un acceso abierto en celda 3 para simular ocupada
  await pool.query(
    "INSERT INTO accesos_vehiculos (id_vehiculo, id_celda, id_puerta_ingreso, id_operador_ingreso, id_turno_ingreso) VALUES (1, 3, 1, 1, 1)",
  ).catch(() => {});

  const req = { params: { id: 3 }, body: { en_mantenimiento: true, minutos_mantenimiento: 10 } };
  const res = mockRes();
  await cambiarEstadoCelda(req, res);
  assert.equal(res.statusCode, 400);

  // Limpiar
  await pool.query("DELETE FROM accesos_vehiculos WHERE id_celda = 3 AND fecha_salida IS NULL").catch(() => {});
});

test("celdas: eliminar celda libre sin historial", async () => {
  // Usar celda 80 (moto) que no tiene historial
  const req = { params: { id: 80 } };
  const res = mockRes();
  await eliminarCelda(req, res);
  assert.equal(res.statusCode, 200);

  const [rows] = await pool.query("SELECT id_celda FROM celdas WHERE id_celda = 80");
  assert.equal(rows.length, 0);
});

test("cleanup: restaurar celda 80 y estado de celdas", async () => {
  // Restaurar celda 80
  await pool.query("INSERT INTO celdas (id_celda, id_tipo_vehiculo, letra, numero) VALUES (80, 2, 'H', 10)").catch(() => {});
  // Restaurar celda 1 y 2
  await pool.query("UPDATE celdas SET activa = TRUE, en_mantenimiento = FALSE, mantenimiento_hasta = NULL WHERE id_celda IN (1,2)");
  await pool.end();
});