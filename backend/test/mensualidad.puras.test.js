// backend/test/mensualidad.puras.test.js
// Pruebas de las reglas de mensualidad (RNF22.1). NO usan base de datos:
// solo funciones puras, se corren rápido:  node --test test/mensualidad.puras.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularFin,
  planificarPeriodo,
  derivarEstado,
  estadoEfectivo,
  puedeIngresar,
  diasParaVencer,
  hoyBogota,
  CUPOS_POR_TIPO,
  DIAS_ANTICIPACION_MAX,
} from "../src/utils/mensualidad.js";

const HOY = "2026-11-19";
const fila = (id, inicio, fin, estado = "activa") => ({
  id_mensualidad: id,
  fecha_inicio: inicio,
  fecha_fin: fin,
  estado,
});

// ---------- Constantes del negocio (RF05.5, RF05.9) ----------
test("reglas: 5 días de anticipación y cupos 70 carros / 10 motos", () => {
  assert.equal(DIAS_ANTICIPACION_MAX, 5);
  assert.deepEqual(CUPOS_POR_TIPO, { carro: 70, moto: 10 });
});

test("hoyBogota devuelve una fecha AAAA-MM-DD (y no texto raro)", () => {
  assert.match(hoyBogota(), /^\d{4}-\d{2}-\d{2}$/);
});

// ---------- RF05.4: cálculo del periodo ----------
test("calcularFin: un mes menos un día", () => {
  assert.equal(calcularFin("2026-11-19"), "2026-12-18");
});

test("calcularFin: respeta meses cortos", () => {
  assert.equal(calcularFin("2026-01-31"), "2026-02-27");
});

test("periodo: vehículo nuevo arranca hoy", () => {
  const p = planificarPeriodo(null, HOY);
  assert.equal(p.inicio, HOY);
  assert.equal(p.fin, "2026-12-18");
  assert.equal(p.esRenovacion, false);
  assert.equal(p.puedePagar, true);
});

test("periodo: mensualidad vencida se reactiva hoy (y pide cupo)", () => {
  const p = planificarPeriodo(fila(1, "2026-10-01", "2026-10-31"), HOY);
  assert.equal(p.inicio, HOY);
  assert.equal(p.esRenovacion, false);
  assert.equal(p.puedePagar, true);
});

test("periodo: renovación anticipada arranca el día siguiente al fin", () => {
  const p = planificarPeriodo(fila(1, "2026-10-23", "2026-11-22"), HOY); // faltan 3 días
  assert.equal(p.inicio, "2026-11-23");
  assert.equal(p.fin, "2026-12-22");
  assert.equal(p.esRenovacion, true);
  assert.equal(p.puedePagar, true);
  assert.equal(p.diasRestantes, 3);
});

// ---------- RF05.5: solo se renueva con 5 días o menos ----------
test("renovación: con 10 días restantes todavía no se puede pagar", () => {
  const p = planificarPeriodo(fila(1, "2026-11-01", "2026-11-29"), HOY);
  assert.equal(p.puedePagar, false);
  assert.equal(p.diasRestantes, 10);
});

// ---------- RF06.1: estados ----------
test("estado: Al día cuando el periodo cubre hoy", () => {
  assert.equal(derivarEstado(fila(1, "2026-11-01", "2026-11-30"), HOY), "Al día");
});

test("estado: Pendiente cuando hoy es el último día pagado", () => {
  assert.equal(derivarEstado(fila(1, "2026-10-20", "2026-11-19"), HOY), "Pendiente");
});

test("estado: vencida o sin registros es Sin mensualidad (no existe 'En mora')", () => {
  assert.equal(derivarEstado(fila(1, "2026-10-01", "2026-10-31"), HOY), "Sin mensualidad");
  assert.equal(derivarEstado(null, HOY), "Sin mensualidad");
});

test("estadoEfectivo: acepta una lista y marca el siguiente periodo pagado", () => {
  const r = estadoEfectivo(
    [fila(1, "2026-10-23", "2026-11-22"), fila(2, "2026-11-23", "2026-12-22")],
    HOY,
  );
  assert.equal(r.estado, "Al día");
  assert.equal(r.siguientePagado, true);
  assert.equal(r.fechaFin, "2026-12-22");
});

test("estadoEfectivo: lista vacía es Sin mensualidad", () => {
  const r = estadoEfectivo([], HOY);
  assert.equal(r.estado, "Sin mensualidad");
  assert.equal(r.vigente, null);
});

// Regresión: antes vehiculoController le pasaba UN OBJETO en vez de una lista.
test("estadoEfectivo falla si le pasan un objeto en vez de una lista", () => {
  assert.throws(() => estadoEfectivo(fila(1, "2026-11-01", "2026-11-30"), HOY));
});

// ---------- RF06.7: quién puede ingresar ----------
test("ingreso: permitido Al día y Pendiente, bloqueado Sin mensualidad", () => {
  assert.equal(puedeIngresar("Al día"), true);
  assert.equal(puedeIngresar("Pendiente"), true);
  assert.equal(puedeIngresar("Sin mensualidad"), false);
});

test("diasParaVencer cuenta días calendario", () => {
  assert.equal(diasParaVencer("2026-11-24", HOY), 5);
  assert.equal(diasParaVencer(HOY, HOY), 0);
});