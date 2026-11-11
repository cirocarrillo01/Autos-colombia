/** Error de negocio con código HTTP (400/403/404/409...). */
export class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.name = "ErrorNegocio";
    this.status = status;
  }
}

/** "true"/"false"/1/0/booleanos -> boolean; null si no es válido. */
export function aBooleano(valor) {
  if (valor === true || valor === "true" || valor === 1 || valor === "1")
    return true;
  if (valor === false || valor === "false" || valor === 0 || valor === "0")
    return false;
  return null;
}
