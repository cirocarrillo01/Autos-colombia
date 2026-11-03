// frontend/src/Components/layout/SidebarData.jsx
/**
 * Datos del sidebar: cada item tiene title, iconName (string), link y roles.
 * `roles` define quién lo ve.
 *
 * - Todos: Dashboard, Vehículo, Ingreso/Salida, Mensualidades, Celdas.
 * - Solo administrador: Usuarios.
 *
 * NOTA: "Celdas" lo ven ambos roles, pero en la ruta /celdas se renderiza
 * CeldasPage para administrador (escritura) y OperatorCeldasPage para
 * operador (solo lectura). La reubicación de vehículos se hace desde
 * CeldasPage (botón "Reubicar" en cada celda ocupada).
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
  // Ambos roles. En /celdas se resuelve admin vs operador.
  { title: "Celdas", iconName: "cells", link: "/celdas", roles: TODOS },

  // Solo administrador
  { title: "Usuarios", iconName: "users", link: "/users", roles: ADMIN },
];

export default SidebarData;
