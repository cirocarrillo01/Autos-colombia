import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import { registrarEntrada, registrarSalida } from "../src/controllers/movimientoController.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test("movimiento: entrada y salida de un vehiculo", async () => {
  // Obtener id de celda B-01
  const [celdas] = await pool.query(
    "SELECT id_celda FROM celdas WHERE codigo = 'B-01' LIMIT 1",
  );
  const idCelda = celdas[0].id_celda;

  // Asegurar que CAR002 no esté adentro
  await pool.query(
    "UPDATE accesos_vehiculos SET fecha_salida = UTC_TIMESTAMP() WHERE id_vehiculo = (SELECT id_vehiculo FROM vehiculos WHERE placa = 'CAR002') AND fecha_salida IS NULL",
  );

  const reqEntrada = {
    body: { placa: "CAR002", id_celda: idCelda },
    user: { id_usuario: 1 },
  };
  const resEntrada = mockRes();
  await registrarEntrada(reqEntrada, resEntrada);
  assert.equal(resEntrada.statusCode, 201);
  assert.equal(resEntrada.body.accion, "entrada");
  assert.equal(resEntrada.body.placa, "CAR002");

  const reqSalida = {
    body: { placa: "CAR002" },
    user: { id_usuario: 1 },
  };
  const resSalida = mockRes();
  await registrarSalida(reqSalida, resSalida);
  assert.equal(resSalida.statusCode, 200);
  assert.equal(resSalida.body.accion, "salida");
});

test("movimiento: entrada duplicada devuelve 409 o 400", async () => {
  const [celdas] = await pool.query(
    "SELECT id_celda FROM celdas WHERE codigo = 'B-02' LIMIT 1",
  );
  const idCelda = celdas[0].id_celda;

  // Limpiar accesos abiertos de CAR003
  await pool.query(
    "UPDATE accesos_vehiculos SET fecha_salida = UTC_TIMESTAMP() WHERE id_vehiculo = (SELECT id_vehiculo FROM vehiculos WHERE placa = 'CAR003') AND fecha_salida IS NULL",
  );

  const req1 = { body: { placa: "CAR003", id_celda: idCelda }, user: { id_usuario: 1 } };
  const res1 = mockRes();
  await registrarEntrada(req1, res1);
  assert.equal(res1.statusCode, 201);

  // Segundo ingreso debe fallar
  const req2 = { body: { placa: "CAR003", id_celda: idCelda }, user: { id_usuario: 1 } };
  const res2 = mockRes();
  await registrarEntrada(req2, res2);
  assert.ok(res2.statusCode === 400 || res2.statusCode === 409);

  // Limpieza
  await registrarSalida({ body: { placa: "CAR003" }, user: { id_usuario: 1 } }, mockRes());
});

test("cleanup: cerrar accesos de prueba", async () => {
  await pool.query(
    "UPDATE accesos_vehiculos SET fecha_salida = UTC_TIMESTAMP() WHERE id_vehiculo IN (SELECT id_vehiculo FROM vehiculos WHERE placa IN ('CAR002','CAR003')) AND fecha_salida IS NULL",
  );
  await pool.end();
});