// Autorización por rol. Usar DESPUÉS de autenticar.
export const autorizarRoles =
  (...roles) =>
  (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: "Autenticación requerida" });
    if (!roles.includes(req.user.rol)) {
      return res
        .status(403)
        .json({ error: "No tiene permisos para realizar esta acción" });
    }
    next();
  };
export default { autorizarRoles };
