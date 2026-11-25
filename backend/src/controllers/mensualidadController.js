// backend/src/controllers/mensualidadController.js
// Controlador de mensualidades y confirmación de pagos (RF05/RF06).
import { pool, query } from "../config/db.js";
import { responder } from "../utils/responseHelper.js";
import { MSG } from "../utils/messages.js";
import { ErrorNegocio } from "../utils/errores.js";
import { paginar, likeSeguro } from "../utils/consultas.js";
import {
  SQL_HOY_BOGOTA,
  sqlFechaBogota,
} from "../utils/fechas.js";
import { getOrCreateTurno } from "../utils/turno.js";
import { registrarAudit } from "../repositories/auditRepository.js";
import { validarPlaca } from "../validators/placa.js";
import {
  SQL_ULTIMA_MENSUALIDAD,
  ESTADO_MENSUALIDAD,
  CUPOS_POR_TIPO,
  DIAS_ANTICIPACION_MAX,
  derivarEstado,
  diasParaVencer,
  planificarPeriodo,
  elegirVigente,
  sqlOrdenVigente,
  estadoEfectivo,
  estadoFila,
  hoyBogota,
  aYMD,
} from "../utils/mensualidad.js";
import * as svc from "../services/mensualidadService.js";
import { ocupadosPorTipo } from "../services/mensualidadService.js";

const manejar = (res, err, msg500 = MSG.ERROR_INTERNO) => {
  if (err instanceof ErrorNegocio)
    return responder(res, err.status, err.message);
  console.error(err);
  return responder(res, 500, msg500);
};

/** Turno abierto del usuario (lo crea si no existe). */
async function operadorYTurno(idUsuario) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const idTurno = await getOrCreateTurno(conn, idUsuario);
    await conn.commit();
    return idTurno;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// Subconsulta: mensualidad vigente por vehículo (la que cubre hoy; si no, la más reciente).
const JOIN_VIGENTE = `
  LEFT JOIN mensualidades m ON m.id_mensualidad = (
    SELECT m2.id_mensualidad FROM mensualidades m2
    WHERE m2.id_vehiculo = v.id_vehiculo AND m2.estado <> 'cancelada'
    ORDER BY ${sqlOrdenVigente("m2")} LIMIT 1
  )`;

// ============ RF05: Confirmar pago recibido ============

export const registrarPago = async (req, res) => {
  try {
    const { placa } = req.body ?? {};
    if (!placa) return responder(res, 422, "La placa es obligatoria");

    const idTurno = await operadorYTurno(req.user.id_usuario);
    const r = await svc.registrarPago({
      idUsuario: req.user.id_usuario,
      idTurno,
      placa,
    });

    const [v] = await query(
      `SELECT propietario_nombre FROM vehiculos WHERE placa = ? LIMIT 1`,
      [r.placa],
    );
    r.propietario = v?.propietario_nombre ?? null;

    // Auditoría: quién confirmó qué pago (no bloquea la respuesta si falla)
    registrarAudit({
      id_usuario: req.user.id_usuario,
      usuario_login: req.user.usuario_login,
      accion: "pago_confirmado",
      recurso: `mensualidad:${r.id_mensualidad}`,
      detalle: `placa=${r.placa}; periodo=${r.periodo.inicio}..${r.periodo.fin}; valor=${r.valor}`,
      ip_address: req.ip,
    }).catch((e) => console.error("audit pago:", e.message));

    return responder(res, 201, `Pago ${r.placa} registrado`, { pago: r });
  } catch (err) {
    manejar(res, err, "Error al confirmar el pago");
  }
};

/** Previsualización previa a confirmar (RF05.12). Solo calcula, no persiste. */
export const previsualizarPago = async (req, res) => {
  try {
    const { placa } = req.query;
    if (!placa) return responder(res, 422, "La placa es obligatoria");
    
    const f = validarPlaca(placa);
    if (!f.valida) return responder(res, 422, f.error);

    const [v] = await query(
      `SELECT v.id_vehiculo, v.placa, v.propietario_nombre AS propietario,
              v.id_tipo_vehiculo, tv.codigo AS tipo_codigo, tv.nombre AS tipo,
              tv.tarifa_mensual
       FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       WHERE v.placa = ? AND v.activo = TRUE LIMIT 1`,
      [f.placa],
    );
    if (!v) return responder(res, 404, MSG.NO_ENCONTRADO("Vehículo"));

    const [vigente = null] = await query(SQL_ULTIMA_MENSUALIDAD, [
      v.id_vehiculo,
    ]);
    const estado = derivarEstado(vigente);
    const plan = planificarPeriodo(vigente, hoyBogota());

    // Verificar si ya existe el siguiente periodo pagado
    let siguientePagado = false;
    if (vigente) {
      const [s] = await query(
        `SELECT 1 FROM mensualidades
         WHERE id_vehiculo = ? AND estado <> 'cancelada' AND fecha_inicio > ? LIMIT 1`,
        [v.id_vehiculo, aYMD(vigente.fecha_fin)],
      );
      siguientePagado = !!s;
    }

    const ocupados = await svc.contarOcupados(pool, v.id_tipo_vehiculo);
    const max = CUPOS_POR_TIPO[v.tipo_codigo] ?? null;
    const hayCupo = max === null || plan.esRenovacion || ocupados < max;

    let motivo = null;
    if (siguientePagado) motivo = "El vehículo ya tiene confirmado el siguiente periodo.";
    else if (!plan.puedePagar)
      motivo = `Mensualidad vigente: podrá renovar cuando falten ${DIAS_ANTICIPACION_MAX} días o menos (faltan ${plan.diasRestantes}).`;
    else if (!hayCupo) motivo = `No hay cupo disponible para ${v.tipo}.`;

    return responder(res, 200, "Previsualización del pago", {
      placa: v.placa,
      propietario: v.propietario,
      tipo: v.tipo,
      valor: Number(v.tarifa_mensual),
      periodo: { inicio: plan.inicio, fin: plan.fin },
      es_renovacion: plan.esRenovacion,
      puede_pagar: !siguientePagado && plan.puedePagar && hayCupo,
      motivo_bloqueo: motivo,
      dias_restantes: plan.diasRestantes,
      estado_actual: estado,
      hay_cupo: hayCupo,
      cupo: { ocupados, max },
    });
  } catch (err) {
    manejar(res, err, "Error al previsualizar el pago");
  }
};

// ============ RF05.11: Cancelar mensualidad ============
export const cancelarMensualidad = async (req, res) => {
  try {
    const { placa } = req.body ?? {};
    if (!placa) return responder(res, 422, "La placa es obligatoria");
    const r = await svc.cancelarMensualidad({ placa });
    registrarAudit({
      id_usuario: req.user.id_usuario,
      usuario_login: req.user.usuario_login,
      accion: "mensualidad_cancelada",
      recurso: `vehiculo:${r.placa}`,
      detalle: `placa=${r.placa}; periodo=${r.periodo.inicio}..${r.periodo.fin}; valor=${r.valor}; canceladas=${r.canceladas}`,
      ip_address: req.ip,
    }).catch((e) => console.error("audit cancelar:", e.message));
    return responder(res, 200, `Mensualidad de ${r.placa} cancelada. El cupo quedó libre.`, r);
  } catch (err) {
    manejar(res, err, "Error al cancelar la mensualidad");
  }
};

// ============ RF05.16: Eliminar vehículo sin historial ============
export const eliminarVehiculo = async (req, res) => {
  try {
    const { placa } = req.body ?? {};
    if (!placa) return responder(res, 422, "La placa es obligatoria");
    const r = await svc.eliminarVehiculo({ placa });
    registrarAudit({
      id_usuario: req.user.id_usuario,
      usuario_login: req.user.usuario_login,
      accion: "vehiculo_eliminado",
      recurso: `vehiculo:${r.placa}`,
      detalle: `placa=${r.placa}`,
      ip_address: req.ip,
    }).catch((e) => console.error("audit eliminar:", e.message));
    return responder(res, 200, "Vehículo eliminado correctamente", r);
  } catch (err) {
    manejar(res, err, "Error al eliminar el vehículo");
  }
};

// ============ RF06: Consultas ============

export const listarMensualidades = async (req, res) => {
  try {
    const { page, limit, offset } = paginar(req.query, { porDefecto: 10 });
    const { q, estado, tipo } = req.query;

    if (estado && !Object.values(ESTADO_MENSUALIDAD).includes(estado))
      return responder(res, 422, MSG.FORMATO_INVALIDO("Estado"));
    if (tipo && !["carro", "moto"].includes(tipo))
      return responder(res, 422, MSG.FORMATO_INVALIDO("Tipo"));

    const conds = [`v.activo = TRUE`];
    const params = [];
    if (q) {
      conds.push(`(v.placa LIKE ? OR v.propietario_documento LIKE ?)`);
      const s = likeSeguro(q);
      params.push(s, s);
    }
    if (tipo === "carro" || tipo === "moto") {
      conds.push(`tv.codigo = ?`);
      params.push(tipo);
    }
    const where = `WHERE ${conds.join(" AND ")}`;

    // Obtener TODAS las mensualidades por vehículo (no solo la "vigente" SQL)
    // para poder elegir la correcta en JS (elegirVigente considera renovación anticipada).
    const sql = `
      SELECT v.id_vehiculo, v.placa, v.propietario_nombre AS propietario,
             v.propietario_documento AS documento,
             tv.codigo AS tipo_codigo, tv.nombre AS tipo,
             tv.tarifa_mensual AS valor,
             m.id_mensualidad, m.fecha_inicio, m.fecha_fin, m.estado AS estado_bd,
             (SELECT COUNT(*) FROM accesos_vehiculos a WHERE a.id_vehiculo = v.id_vehiculo AND a.fecha_salida IS NULL) AS dentro
      FROM vehiculos v
      INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
      LEFT JOIN mensualidades m ON m.id_vehiculo = v.id_vehiculo AND m.estado <> 'cancelada'
      ${where}
      ORDER BY v.placa, m.fecha_inicio DESC`;

    const rows = await query(sql, params);

    const hoy = hoyBogota();
    // Agrupar por vehículo y elegir la vigente con elegirVigente (considera renovación anticipada)
    const byVehicle = new Map();
    for (const r of rows) {
      const key = r.id_vehiculo;
      if (!byVehicle.has(key)) {
        byVehicle.set(key, {
          vehiculo: {
            id_vehiculo: r.id_vehiculo,
            placa: r.placa,
            propietario: r.propietario,
            documento: r.documento,
            tipo: r.tipo,
            tipo_codigo: r.tipo_codigo,
            valor: r.valor,
            dentro: !!r.dentro,
          },
          mensualidades: [],
        });
      }
      if (r.id_mensualidad) {
        byVehicle.get(key).mensualidades.push({
          id_mensualidad: r.id_mensualidad,
          fecha_inicio: aYMD(r.fecha_inicio),
          fecha_fin: aYMD(r.fecha_fin),
          estado: r.estado_bd,
          valor: r.valor,
        });
      }
    }

    // Calcular ocupados por tipo para cupo (RF06.6)
    const ocupados = await ocupadosPorTipo(pool);
    const { AL_DIA, PENDIENTE, SIN_MENSUALIDAD } = ESTADO_MENSUALIDAD;

    let data = [];
    for (const [, group] of byVehicle) {
      const { vigente, estado, fechaFin, siguientePagado } = estadoEfectivo(group.mensualidades, hoy);
      const dias = fechaFin ? diasParaVencer(fechaFin, hoy) : null;
      const tipoCodigo = group.vehiculo.tipo_codigo;

      const esNuevo = estado === SIN_MENSUALIDAD;
      const puedeRenovar =
        !siguientePagado &&
        (estado === PENDIENTE || (estado === AL_DIA && dias !== null && dias <= DIAS_ANTICIPACION_MAX));
      const sinCupo = esNuevo && (ocupados[tipoCodigo] ?? 0) >= (CUPOS_POR_TIPO[tipoCodigo] ?? Infinity);

      data.push({
        id_vehiculo: group.vehiculo.id_vehiculo,
        placa: group.vehiculo.placa,
        propietario: group.vehiculo.propietario,
        documento: group.vehiculo.documento,
        tipo: group.vehiculo.tipo,
        tipo_codigo: group.vehiculo.tipo_codigo,
        estado,
        valor: group.vehiculo.valor,
        fecha_vencimiento: fechaFin,
        dias_para_vencer: dias,
        siguiente_pagado: siguientePagado,
        puede_renovar: puedeRenovar,
        sin_cupo: sinCupo,
        puede_pagar: (esNuevo || puedeRenovar) && !sinCupo,
        id_mensualidad: vigente ? vigente.id_mensualidad : null,
        dentro: group.vehiculo.dentro,
      });
    }

    // Ordenar: 1. Puede renovar (Pendiente/Vence pronto), 2. Al día, 3. Otros.
    // Dentro de cada grupo, ordenar por fecha de vencimiento ascendente (más próximo primero).
    const prioridad = (d) => (d.puede_renovar ? 1 : d.estado === ESTADO_MENSUALIDAD.AL_DIA ? 2 : 3);
    data.sort((a, b) => 
      prioridad(a) - prioridad(b) || 
      (a.dias_para_vencer ?? 999) - (b.dias_para_vencer ?? 999) || 
      a.placa.localeCompare(b.placa)
    );

    let total;
    if (estado) {
      data = data.filter((d) => d.estado === estado);
      total = data.length;
    } else {
      total = data.length;
    }

    // Paginar siempre en memoria para respetar el orden de prioridad global
    data = data.slice(offset, offset + limit);

    return responder(res, 200, MSG.LISTADO("Mensualidades"), {
      rows: data,
      total,
      page,
      limit,
    });
  } catch (err) {
    manejar(res, err, "Error al listar las mensualidades");
  }
};

/** Resumen por tipo (RF06.4). */
export const resumenMensualidades = async (_req, res) => {
  try {
    // Obtener TODAS las mensualidades por vehículo para resumen correcto
    const rows = await query(
      `SELECT tv.codigo AS tipo, v.id_vehiculo,
              m.fecha_inicio, m.fecha_fin, m.estado AS estado_bd, m.id_mensualidad, m.valor
       FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       LEFT JOIN mensualidades m ON m.id_vehiculo = v.id_vehiculo AND m.estado <> 'cancelada'
       WHERE v.activo = TRUE`,
    );

    const hoy = hoyBogota();
    const byVehicle = new Map();
    for (const r of rows) {
      const key = r.id_vehiculo;
      if (!byVehicle.has(key)) {
        byVehicle.set(key, {
          tipo: r.tipo,
          mensualidades: [],
        });
      }
      if (r.id_mensualidad) {
        byVehicle.get(key).mensualidades.push({
          id_mensualidad: r.id_mensualidad,
          fecha_inicio: aYMD(r.fecha_inicio),
          fecha_fin: aYMD(r.fecha_fin),
          estado: r.estado_bd,
          valor: r.valor,
        });
      }
    }

    const acc = {};
    // Inicializar siempre ambos tipos (RF06.4)
    for (const [tipo, cap] of Object.entries(CUPOS_POR_TIPO)) {
      acc[tipo] = { tipo, al_dia: 0, pendiente: 0, sin_mensualidad: 0, ocupados: 0, capacidad: cap };
    }
    for (const [, group] of byVehicle) {
      const { estado } = estadoEfectivo(group.mensualidades, hoy);
      if (estado === ESTADO_MENSUALIDAD.AL_DIA) acc[group.tipo].al_dia++;
      else if (estado === ESTADO_MENSUALIDAD.PENDIENTE) acc[group.tipo].pendiente++;
      else acc[group.tipo].sin_mensualidad++;
      if (estado !== ESTADO_MENSUALIDAD.SIN_MENSUALIDAD) acc[group.tipo].ocupados++;
    }
    return responder(res, 200, MSG.RESUMEN("Mensualidades"), {
      porTipo: Object.values(acc),
    });
  } catch (err) {
    manejar(res, err, "Error al generar el resumen");
  }
};

/** Detalle por placa con historial de pagos (RF06.5). */
export const detallePorPlaca = async (req, res) => {
  try {
    const { placa } = req.params;
    const f = validarPlaca(placa);
    if (!f.valida) return responder(res, 422, f.error);

    const [v] = await query(
      `SELECT v.id_vehiculo, v.placa, v.propietario_nombre AS propietario,
              v.propietario_tipo_documento AS tipo_documento, v.propietario_documento AS documento,
              v.propietario_telefono AS telefono, v.propietario_email AS email,
              v.color, v.modelo, v.nombre_modelo,
              tv.codigo AS tipo_codigo, tv.nombre AS tipo, tv.tarifa_mensual
       FROM vehiculos v
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       WHERE v.placa = ? LIMIT 1`,
      [f.placa],
    );
    if (!v) return responder(res, 404, MSG.NO_ENCONTRADO("Vehículo"));

    const mensualidadesBD = await query(
      `SELECT m.id_mensualidad, m.fecha_inicio, m.fecha_fin, m.estado, m.valor,
              m.fecha_creacion AS fecha_registro
       FROM mensualidades m WHERE m.id_vehiculo = ?
       ORDER BY m.fecha_inicio DESC`,
      [v.id_vehiculo],
    );
    const hoy = hoyBogota();
    // Estado derivado por fila mirando si hay periodo siguiente pagado
    const mensualidades = mensualidadesBD.map((m) => ({
      ...m,
      fecha_inicio: aYMD(m.fecha_inicio),
      fecha_fin: aYMD(m.fecha_fin),
      estado: m.estado === "cancelada" ? "cancelada" : estadoFila(m, mensualidadesBD, hoy),
    }));

    const { vigente, estado } = estadoEfectivo(mensualidadesBD, hoy);

    const proximoBD = mensualidadesBD
      .filter((m) => m.estado !== "cancelada"
        && aYMD(m.fecha_inicio) > hoy
        && m.id_mensualidad !== vigente?.id_mensualidad)
      .sort((a, b) => aYMD(a.fecha_inicio).localeCompare(aYMD(b.fecha_inicio)))[0];
    const proximo_periodo = proximoBD
      ? { id_mensualidad: proximoBD.id_mensualidad, fecha_inicio: aYMD(proximoBD.fecha_inicio),
          fecha_fin: aYMD(proximoBD.fecha_fin), valor: proximoBD.valor }
      : null;

    const pagosBD = await query(
      `SELECT p.id_pago, p.fecha_pago, p.monto,
              m.fecha_inicio AS periodo_inicio, m.fecha_fin AS periodo_fin,
              u.nombres AS operador_nombres, u.apellidos AS operador_apellidos
       FROM pagos p
       INNER JOIN mensualidades m ON m.id_mensualidad = p.id_mensualidad
       LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
       WHERE m.id_vehiculo = ?
       ORDER BY p.fecha_pago DESC`,
      [v.id_vehiculo],
    );
    const pagos = pagosBD.map((p) => ({
      ...p,
      periodo_inicio: aYMD(p.periodo_inicio),
      periodo_fin: aYMD(p.periodo_fin),
    }));

    let actual = null;
    if (vigente && estado !== ESTADO_MENSUALIDAD.SIN_MENSUALIDAD) {
      const [p] = await query(
        `SELECT u.usuario_login FROM pagos p 
         INNER JOIN usuarios u ON u.id_usuario = p.id_usuario 
         WHERE p.id_mensualidad = ? LIMIT 1`,
        [vigente.id_mensualidad]
      );
      actual = {
        id_mensualidad: vigente.id_mensualidad,
        fecha_inicio: aYMD(vigente.fecha_inicio),
        fecha_fin: aYMD(vigente.fecha_fin),
        valor: vigente.valor,
        estado,
        confirmador: p?.usuario_login ?? "sistema",
      };
    }

    return responder(res, 200, MSG.ENCONTRADO("Mensualidad"), {
      vehiculo: { ...v, estado },
      mensualidad_actual: actual,
      proximo_periodo,
      historial_mensualidades: mensualidades,
      historial_pagos: pagos,
    });
  } catch (err) {
    manejar(res, err, "Error al obtener el detalle");
  }
};

/** Próximos a vencer ≤5 días que aún no confirmaron el siguiente periodo (RF06.9). */
export const proximosAVencer = async (_req, res) => {
  try {
    const rows = await query(
      `SELECT v.placa, v.propietario_nombre AS propietario, tv.nombre AS tipo,
              m.fecha_fin, m.id_mensualidad
       FROM mensualidades m
       INNER JOIN vehiculos v ON v.id_vehiculo = m.id_vehiculo
       INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
       WHERE m.estado <> 'cancelada'
         AND v.activo = TRUE
         AND m.fecha_fin BETWEEN ${SQL_HOY_BOGOTA} AND DATE_ADD(${SQL_HOY_BOGOTA}, INTERVAL ? DAY)
         AND NOT EXISTS (
           SELECT 1 FROM mensualidades n
           WHERE n.id_vehiculo = m.id_vehiculo
             AND n.estado <> 'cancelada'
             AND n.fecha_inicio > m.fecha_fin)
       ORDER BY m.fecha_fin`,
      [DIAS_ANTICIPACION_MAX],
    );
    return responder(
      res,
      200,
      MSG.LISTADO("Próximos a vencer"),
      rows.map((r) => ({ ...r, fecha_fin: aYMD(r.fecha_fin) })),
    );
  } catch (err) {
    manejar(res, err, "Error al obtener próximos a vencer");
  }
};
