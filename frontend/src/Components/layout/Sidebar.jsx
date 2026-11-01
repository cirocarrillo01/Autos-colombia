// frontend/src/Components/layout/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";
import SidebarData from "./SidebarData.jsx";
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

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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
          onClick={handleLogout}
          title="Cerrar Sesión"
        >
          <LogoutIcon /> <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
