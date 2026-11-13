import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/db.js";
import {
  registrarEntrada,
  registrarSalida,
  listarDentro,
} from "../src/controllers/movimientoController.js";
import { setupTestDB } from "./helpers/db.js";

test("setup: inicializar BD", async () => {
  await setupTestDB();
});

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
  // Asegurar vehiculo CAR002 y mensualidad activa
  const [vRows] = await pool.query("SELECT id_vehiculo FROM vehiculos WHERE placa = 'CAR002' LIMIT 1");
  if (vRows.length > 0) {
    const idV = vRows[0].id_vehiculo;
    const [mRows] = await pool.query("SELECT id_mensualidad FROM mensualidades WHERE id_vehiculo = ? LIMIT 1", [idV]);
    if (mRows.length > 0) {
      await pool.query("UPDATE mensualidades SET estado = 'activa', fecha_inicio = '2020-01-01', fecha_fin = '2099-12-31' WHERE id_vehiculo = ?", [idV]);
    } else {
      await pool.query("INSERT INTO mensualidades (id_vehiculo, fecha_inicio, fecha_fin, tarifa_aplicada, valor_pagado, estado) VALUES (?, '2020-01-01', '2099-12-31', 100000, 100000, 'activa')", [idV]);
    }
  }

  // Obtener id de celda B-1
  const [celdas] = await pool.query(
    "SELECT id_celda FROM celdas WHERE codigo = 'B-1' LIMIT 1",
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
  // Asegurar vehiculo CAR003 y mensualidad activa
  const [vRows] = await pool.query("SELECT id_vehiculo FROM vehiculos WHERE placa = 'CAR003' LIMIT 1");
  if (vRows.length > 0) {
    const idV = vRows[0].id_vehiculo;
    const [mRows] = await pool.query("SELECT id_mensualidad FROM mensualidades WHERE id_vehiculo = ? LIMIT 1", [idV]);
    if (mRows.length > 0) {
      await pool.query("UPDATE mensualidades SET estado = 'activa', fecha_inicio = '2020-01-01', fecha_fin = '2099-12-31' WHERE id_vehiculo = ?", [idV]);
    } else {
      await pool.query("INSERT INTO mensualidades (id_vehiculo, fecha_inicio, fecha_fin, tarifa_aplicada, valor_pagado, estado) VALUES (?, '2020-01-01', '2099-12-31', 100000, 100000, 'activa')", [idV]);
    }
  }

  const [celdas] = await pool.query(
    "SELECT id_celda FROM celdas WHERE codigo = 'B-2' LIMIT 1",
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

test("movimiento: entrada en celda ya ocupada devuelve 409", async () => {
  for (const placa of ["CAR002", "CAR003"]) {
    const [vRows] = await pool.query(
      "SELECT id_vehiculo FROM vehiculos WHERE placa = ? LIMIT 1",
      [placa],
    );
    if (vRows.length > 0) {
      const idV = vRows[0].id_vehiculo;
      await pool.query(
        "UPDATE mensualidades SET estado = 'activa', fecha_inicio = '2020-01-01', fecha_fin = '2099-12-31' WHERE id_vehiculo = ?",
        [idV],
      );
    }
  }
  await pool.query(
    "UPDATE accesos_vehiculos SET fecha_salida = UTC_TIMESTAMP() WHERE id_vehiculo IN (SELECT id_vehiculo FROM vehiculos WHERE placa IN ('CAR002','CAR003')) AND fecha_salida IS NULL",
  );

  const [celdas] = await pool.query(
    "SELECT id_celda FROM celdas WHERE codigo = 'B-3' LIMIT 1",
  );
  const idCelda = celdas[0].id_celda;

  const req1 = { body: { placa: "CAR002", id_celda: idCelda }, user: { id_usuario: 1 } };
  const res1 = mockRes();
  await registrarEntrada(req1, res1);
  assert.equal(res1.statusCode, 201);

  const req2 = { body: { placa: "CAR003", id_celda: idCelda }, user: { id_usuario: 1 } };
  const res2 = mockRes();
  await registrarEntrada(req2, res2);
  assert.equal(res2.statusCode, 409);
  assert.equal(res2.body.error, "La celda ya no está disponible");

  await registrarSalida(
    { body: { placa: "CAR002" }, user: { id_usuario: 1 } },
    mockRes(),
  );
});

test("movimiento: entrada con mensualidad que aun no inicia devuelve 403", async () => {
  const [vRows] = await pool.query(
    "SELECT id_vehiculo FROM vehiculos WHERE placa = 'CAR006' LIMIT 1",
  );
  const idV = vRows[0].id_vehiculo;
  // Guardar el estado original de la mensualidad para restaurarlo al final
  // (evita afectar a otras suites que corren en paralelo y leen CAR006).
  const [mensualidadOriginal] = await pool.query(
    "SELECT fecha_inicio, fecha_fin, estado FROM mensualidades WHERE id_vehiculo = ? LIMIT 1",
    [idV],
  );
  const original = mensualidadOriginal[0];
  try {
    await pool.query(
      "UPDATE mensualidades SET estado = 'activa', fecha_inicio = DATE_ADD(DATE(UTC_TIMESTAMP() - INTERVAL 5 HOUR), INTERVAL 1 DAY), fecha_fin = DATE_ADD(DATE(UTC_TIMESTAMP() - INTERVAL 5 HOUR), INTERVAL 32 DAY) WHERE id_vehiculo = ?",
      [idV],
    );
    await pool.query(
      "UPDATE accesos_vehiculos SET fecha_salida = UTC_TIMESTAMP() WHERE id_vehiculo = ? AND fecha_salida IS NULL",
      [idV],
    );

    const [celdas] = await pool.query(
      "SELECT id_celda FROM celdas WHERE codigo = 'B-4' LIMIT 1",
    );
    const idCelda = celdas[0].id_celda;

    const req = { body: { placa: "CAR006", id_celda: idCelda }, user: { id_usuario: 1 } };
    const res = mockRes();
    await registrarEntrada(req, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, "La mensualidad del vehículo aún no inicia");
  } finally {
    // Restaurar CAR006 exactamente como estaba (sin fechas hardcodeadas)
    if (original) {
      await pool.query(
        "UPDATE mensualidades SET fecha_inicio = ?, fecha_fin = ?, estado = ? WHERE id_vehiculo = ?",
        [original.fecha_inicio, original.fecha_fin, original.estado, idV],
      );
    }
  }
});

test("movimiento: GET /dentro por documento devuelve los 2 vehiculos del propietario", async () => {
  await pool.query(
    "UPDATE vehiculos SET propietario_documento = '1000000001' WHERE placa IN ('CAR001','CAR002')",
  );
  await pool.query(
    "UPDATE accesos_vehiculos SET fecha_salida = UTC_TIMESTAMP() WHERE id_vehiculo IN (SELECT id_vehiculo FROM vehiculos WHERE placa IN ('CAR001','CAR002')) AND fecha_salida IS NULL",
  );

  const [c1] = await pool.query("SELECT id_celda FROM celdas WHERE codigo = 'B-5' LIMIT 1");
  const [c2] = await pool.query("SELECT id_celda FROM celdas WHERE codigo = 'B-6' LIMIT 1");

  await registrarEntrada(
    { body: { placa: "CAR001", id_celda: c1[0].id_celda }, user: { id_usuario: 1 } },
    mockRes(),
  );
  await registrarEntrada(
    { body: { placa: "CAR002", id_celda: c2[0].id_celda }, user: { id_usuario: 1 } },
    mockRes(),
  );

  const req = { query: { q: "1000000001" }, user: { id_usuario: 1 } };
  const res = mockRes();
  await listarDentro(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 2);
  assert.ok(res.body.some((r) => r.placa === "CAR001"));
  assert.ok(res.body.some((r) => r.placa === "CAR002"));

  await pool.query(
    "UPDATE vehiculos SET propietario_documento = CASE placa WHEN 'CAR001' THEN '1000000001' ELSE '1000000002' END WHERE placa IN ('CAR001','CAR002')",
  );
  await registrarSalida(
    { body: { placa: "CAR001" }, user: { id_usuario: 1 } },
    mockRes(),
  );
  await registrarSalida(
    { body: { placa: "CAR002" }, user: { id_usuario: 1 } },
    mockRes(),
  );
});

test("movimiento: salida de vehiculo que ya salio devuelve 400 y audita el rechazo", async () => {
  const [vRows] = await pool.query(
    "SELECT id_vehiculo FROM vehiculos WHERE placa = 'CAR003' LIMIT 1",
  );
  const idV = vRows[0].id_vehiculo;
  await pool.query(
    "UPDATE mensualidades SET estado = 'activa', fecha_inicio = '2020-01-01', fecha_fin = '2099-12-31' WHERE id_vehiculo = ?",
    [idV],
  );
  await pool.query(
    "UPDATE accesos_vehiculos SET fecha_salida = UTC_TIMESTAMP() WHERE id_vehiculo = ? AND fecha_salida IS NULL",
    [idV],
  );

  const [celdas] = await pool.query(
    "SELECT id_celda FROM celdas WHERE codigo = 'B-7' LIMIT 1",
  );
  const idCelda = celdas[0].id_celda;

  await registrarEntrada(
    { body: { placa: "CAR003", id_celda: idCelda }, user: { id_usuario: 1 } },
    mockRes(),
  );
  const res1 = mockRes();
  await registrarSalida({ body: { placa: "CAR003" }, user: { id_usuario: 1 } }, res1);
  assert.equal(res1.statusCode, 200);

  const res2 = mockRes();
  await registrarSalida({ body: { placa: "CAR003" }, user: { id_usuario: 1 } }, res2);
  assert.equal(res2.statusCode, 400);
  assert.equal(res2.body.error, "El vehículo no se encuentra en el parqueadero");

  const [audit] = await pool.query(
    "SELECT COUNT(*) AS n FROM audit_log WHERE accion = 'salida_rechazada' AND detalle LIKE ?",
    [`%CAR003%`],
  );
  assert.ok(Number(audit[0].n) >= 1, "se espera una fila salida_rechazada en audit_log");
});

test("cleanup: cerrar accesos de prueba", async () => {
  await pool.query(
    "UPDATE accesos_vehiculos SET fecha_salida = UTC_TIMESTAMP() WHERE id_vehiculo IN (SELECT id_vehiculo FROM vehiculos WHERE placa IN ('CAR001','CAR002','CAR003','CAR004','CAR005','CAR006')) AND fecha_salida IS NULL",
  );
  await pool.end();
});