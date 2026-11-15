// Autorización por rol. Usar DESPUÉS de autenticar.
import { responder } from "../utils/responseHelper.js";
import { MSG } from "../utils/messages.js";

export const autorizarRoles =
  (...roles) =>
  (req, res, next) => {
    if (!req.user)
      return responder(res, 401, MSG.TOKEN_REQUERIDO);
    if (!roles.includes(req.user.rol)) {
      return responder(res, 403, MSG.ACCESO_DENEGADO);
    }
    next();
  };
export default { autorizarRoles };
