// backend/src/middleware/roleMiddleware.js
// Autorización por rol: permite el paso solo si el usuario autenticado tiene uno
// de los roles indicados. Debe usarse DESPUESE de autenticar.
// Uso: router.get("/", autenticar, autorizarRoles("administrador"), controlador);

/**
 * Crea un middleware que restringe el acceso a los roles pasados.
 * @param  {...string} roles - Roles permitidos (ej. "administrador", "operador").
 * @returns {function} middleware Express
 */
export const autorizarRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Autenticación requerida" });
  }
  if (!roles.includes(req.user.rol)) {
    return res.status(403).json({
      error: "No tiene permisos para realizar esta acción",
    });
  }
  next();
};

export default { autorizarRoles };
