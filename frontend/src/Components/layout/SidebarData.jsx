// frontend/src/Components/layout/SidebarData.jsx
/**
 * Datos del sidebar: cada item tiene title, iconName (string), link y roles.
 * `roles` define quién lo ve.
 *
 * - Todos: Dashboard, Vehículo, Ingreso/Salida, Mensualidades.
 * - Solo administrador: Usuarios, Celdas.
 *
 * NOTA: no existe un ítem "Reubicar" en el menú. La reubicación de vehículos
 * se hace desde la página de Celdas (botón ↻ en cada celda ocupada).
 */

const TODOS = ["administrador", "operador"];
const ADMIN = ["administrador"];

export const SidebarData = [
  {
    title: "Dashboard",
    iconName: "dashboard",
    link: "/dashboard",
    roles: TODOS,
  },
  { title: "Vehículo", iconName: "vehicle", link: "/vehiculo", roles: TODOS },
  {
    title: "Ingreso/Salida",
    iconName: "input",
    link: "/ingreso/salida",
    roles: TODOS,
  },
  {
    title: "Mensualidades",
    iconName: "calendar",
    link: "/mensualidad",
    roles: TODOS,
  },

  // Solo administrador
  { title: "Usuarios", iconName: "users", link: "/users", roles: ADMIN },
  { title: "Celdas", iconName: "cells", link: "/celdas", roles: ADMIN },
];

export default SidebarData;
