//frontend/src/Components/layout/SidebarData.js
// Configuración del menú lateral (sidebar).

/**
 * @typedef {Object} SidebarItem
 * @property {string} title - Título del enlace.
 * @property {string} iconName - Nombre clave del icono asociado.
 * @property {string} link - Ruta de destino.
 * @property {string[]} roles - Roles permitidos para ver este item.
 */

/**
 * Roles disponibles para filtros de menú.
 * @readonly
 * @enum {string[]}
 */
export const ROLES = {
  TODOS: ["administrador", "operador"],
  ADMIN: ["administrador"],
};

/**
 * Configuración de items del sidebar.
 * @type {SidebarItem[]}
 */
export const SidebarData = [
  {
    title: "Dashboard",
    iconName: "dashboard",
    link: "/dashboard",
    roles: ROLES.TODOS,
  },
  { title: "Vehículo", iconName: "vehicle", link: "/vehiculo", roles: ROLES.TODOS },
  {
    title: "Ingreso/Salida",
    iconName: "input",
    link: "/ingreso/salida",
    roles: ROLES.TODOS,
  },
  {
    title: "Mensualidades",
    iconName: "calendar",
    link: "/mensualidad",
    roles: ROLES.TODOS,
  },
  // Ambos roles. En /celdas se resuelve admin vs operador.
  { title: "Celdas", iconName: "cells", link: "/celdas", roles: ROLES.TODOS },

  // Solo administrador
  { title: "Usuarios", iconName: "users", link: "/users", roles: ROLES.ADMIN },
];

export default SidebarData;