const SELECT_VEHICULO = `
  SELECT v.id_vehiculo, v.placa, v.propietario_nombre, v.propietario_documento,
         v.modelo, v.nombre_modelo, v.color,
         tv.codigo AS tipo_codigo, tv.nombre AS tipo, tv.tarifa_mensual
  FROM vehiculos v
  INNER JOIN tipos_vehiculos tv ON tv.id_tipo_vehiculo = v.id_tipo_vehiculo
`;

/**
 * Arma la respuesta del vehículo con su estado (Dentro/Fuera) y mensualidad.
 * @param {Object} v - Fila de SELECT_VEHICULO.
 */
async function armarRespuestaVehiculo(v) {
  const [accesoAbierto] = await query(
    `SELECT id_acceso FROM accesos_vehiculos
     WHERE id_vehiculo = ? AND fecha_salida IS NULL LIMIT 1`,
    [v.id_vehiculo],
  );

  const [mensualidad] = await query(SQL_ULTIMA_MENSUALIDAD, [v.id_vehiculo]);

  let estadoMensualidad = "Sin mensualidad";
  if (mensualidad) {
    estadoMensualidad = mensualidad.vigente ? "Al día" : "En mora";
  }

  return {
    id: v.id_vehiculo,
    placa: v.placa,
    estado: accesoAbierto ? "Dentro" : "Fuera",
    mensualidad: v.tarifa_mensual,
    tipo: v.tipo,
    tipoCodigo: v.tipo_codigo,
    modelo: v.modelo ?? "",
    nombreModelo: v.nombre_modelo ?? "",
    color: v.color ?? "",
    usuario: v.propietario_nombre,
    documento: v.propietario_documento,
    estadoMensualidad,
  };
}

/**
 * GET /api/vehiculos/:placa - Información para la pantalla de ingreso/salida.
 */
export const buscarVehiculoPorPlaca = async (req, res) => {
  try {
    const formato = validarPlaca(req.params.placa);
    if (!formato.valida) {
      return res.status(400).json({ error: formato.error });
    }

    const [v] = await query(
      `${SELECT_VEHICULO} WHERE v.placa = ? AND v.activo = TRUE LIMIT 1`,
      [formato.placa],
    );
    if (!v) return res.status(404).json({ error: "Vehículo no encontrado" });

    res.json(await armarRespuestaVehiculo(v));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar el vehículo" });
  }
};

/**
 * GET /api/vehiculos/documento/:documento - Vehículos activos de un propietario.
 * Devuelve un arreglo (puede tener varios vehículos).
 */
export const buscarVehiculosPorDocumento = async (req, res) => {
  try {
    const documento = String(req.params.documento ?? "").trim();
    if (!/^[A-Za-z0-9]{5,20}$/.test(documento)) {
      return res
        .status(400)
        .json({ error: "El documento debe tener entre 5 y 20 caracteres" });
    }

    const vehiculos = await query(
      `${SELECT_VEHICULO}
       WHERE v.propietario_documento = ? AND v.activo = TRUE
       ORDER BY v.placa`,
      [documento],
    );
    if (vehiculos.length === 0) {
      return res
        .status(404)
        .json({ error: "No hay vehículos registrados con ese documento" });
    }

    res.json(await Promise.all(vehiculos.map(armarRespuestaVehiculo)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar los vehículos" });
  }
};
