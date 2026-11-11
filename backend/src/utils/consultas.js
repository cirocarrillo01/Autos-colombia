// Helpers de paginación y LIKE (antes duplicados en 4 sitios).

/** Normaliza page/limit. Nunca devuelve offsets negativos. */
export function paginar(
  { page, limit } = {},
  { porDefecto = 20, maximo = 100 } = {},
) {
  const p = Math.max(Number.parseInt(page, 10) || 1, 1);
  const l = Math.min(
    Math.max(Number.parseInt(limit, 10) || porDefecto, 1),
    maximo,
  );
  return { page: p, limit: l, offset: (p - 1) * l };
}

/** Escapa % y _ para que el usuario no inyecte comodines en un LIKE. */
export const likeSeguro = (texto) =>
  `%${String(texto).replace(/[\\%_]/g, "\\$&")}%`;
