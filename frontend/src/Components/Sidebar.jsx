// frontend/src/Components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { SidebarData } from "./SidebarData.jsx";
import LogoutIcon from "@mui/icons-material/Logout";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="Sidebar">
      {/* 1. Logo */}
      <div className="Sidebar-logo">
        <DirectionsCarIcon fontSize="large" />
        <span>Auto Colombia</span>
      </div>

      {/* 2. Navegación */}
      <nav className="Sidebar-nav">
        <ul className="SidebarList">
          {SidebarData.map((val, key) => (
            <li key={key}>
              <NavLink
                to={val.link}
                // "title" permite identificar el icono cuando el sidebar está plegado (móvil)
                title={val.title}
                className={({ isActive }) => `row ${isActive ? "active" : ""}`}
              >
                <div className="icon">{val.icon}</div>
                <div className="title">{val.title}</div>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* 3. Logout al fondo */}
      <div className="Sidebar-footer">
        {" "}
        {/* 👈 guion corregido */}
        <button
          className="logout-btn"
          onClick={handleLogout}
          title="Cerrar Sesión"
        >
          <LogoutIcon />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
