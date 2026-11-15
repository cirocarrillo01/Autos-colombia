// Diccionario centralizado de mensajes para el backend.
export const MSG = Object.freeze({
  // Éxitos
  GENERICO_EXITO: "Operación realizada correctamente",
  CREADO: (recurso) => `${recurso} registrado exitosamente en el sistema.`,
  ACTUALIZADO: (recurso) => `${recurso} actualizado exitosamente en el sistema.`,
  ELIMINADO: (recurso) => `${recurso} eliminado del sistema permanentemente.`,
  ENCONTRADO: (recurso) => `${recurso} obtenido exitosamente.`,
  LISTADO: (recurso) => `Listado de ${recurso} obtenido exitosamente.`,
  RESUMEN: (recurso) => `Resumen de ${recurso} obtenido exitosamente.`,
  LOGIN_OK: "Sesión iniciada correctamente. Credenciales válidas.",
  LOGOUT_OK: "Sesión cerrada correctamente. Token revocado.",

  // Errores de Cliente (4xx)
  NO_ENCONTRADO: (recurso) => `${recurso} no encontrado en el sistema. Verifique los parámetros de búsqueda.`,
  DUPLICADO: (recurso) => `Conflicto de unicidad: ya existe un registro de ${recurso} con los datos suministrados.`,
  CAMPOS_OBLIGATORIOS: "Faltan campos obligatorios para procesar la solicitud.",
  FORMATO_INVALIDO: (campo) => `El formato proporcionado para '${campo}' es incorrecto o inválido.`,
  ACCESO_DENEGADO: "Acceso denegado: no cuenta con los permisos de rol requeridos.",
  SESION_EXPIRADA: "Su sesión ha expirada o el token provisto ya no es válido. Inicie sesión de nuevo.",
  TOKEN_REQUERIDO: "Autenticación requerida: proporcione un token de acceso válido en los headers.",
  LIMITE_ALCANZADO: (max, tipo) => `Límite operativo excedido: no se pueden procesar más de ${max} elementos para el tipo '${tipo}'.`,
  CELDA_OCUPADA: "Conflicto de ocupación: la celda seleccionada ya se encuentra ocupada por otro vehículo.",
  VEHICULO_DENTRO: "Conflicto de estado: el vehículo ya se encuentra registrado dentro del parqueadero.",
  VEHICULO_FUERA: "Conflicto de estado: el vehículo no se encuentra registrado en el parqueadero.",

  // Errores de Servidor (500)
  ERROR_INTERNO: "Error interno del servidor: ocurrió un fallo inesperado al procesar su solicitud.",
  ERROR_DB: "Error de infraestructura: fallo al conectar o procesar la transacción en la base de datos.",
});
