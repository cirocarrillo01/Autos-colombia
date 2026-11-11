//frontend/src/Components/layout/Sidebar.jsx
// Menú lateral con navegación filtrada por rol y botón de logout.

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";
import SidebarData from "./SidebarData.js";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import CarRentalIcon from "@mui/icons-material/CarRental";
import BookIcon from "@mui/icons-material/Book";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import VerifiedUser from "@mui/icons-material/VerifiedUser";
import SupervisedUserCircle from "@mui/icons-material/SupervisedUserCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import "./Sidebar.css";

const ICONOS = {
  dashboard: DashboardIcon,
  vehicle: CarRentalIcon,
  input: BookIcon,
  users: VerifiedUser,
  cells: SupervisedUserCircle,
  calendar: CalendarMonthIcon,
};

function Sidebar({ rol }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const items = SidebarData.filter((item) => {
    const itemRoles = Array.isArray(item.roles) ? item.roles : [];
    return itemRoles.includes(rol);
  });

  // ✅ S9383: async/await con try/finally (no crea Promises intermedias).
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <aside className="Sidebar">
      <div className="Sidebar-logo">
        <DirectionsCarIcon fontSize="large" />
        <span>Auto Colombia</span>
      </div>

      <nav className="Sidebar-nav">
        <ul className="SidebarList">
          {items.map((item) => {
            const Icono = ICONOS[item.iconName] ?? DashboardIcon;
            return (
              <li key={item.link}>
                <NavLink
                  to={item.link}
                  title={item.title}
                  className={({ isActive }) =>
                    `row ${isActive ? "active" : ""}`
                  }
                >
                  <div className="icon">
                    <Icono />
                  </div>
                  <div className="title">{item.title}</div>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="Sidebar-footer">
        <button
          className="logout-btn"
          // ✅ S9383: la sentencia termina con .catch() explícito.
          onClick={() =>
            handleLogout().catch((error) => {
              console.error("Error inesperado al cerrar sesión:", error);
            })
          }
          title="Cerrar Sesión"
        >
          <LogoutIcon /> <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
