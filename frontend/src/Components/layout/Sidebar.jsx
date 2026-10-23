// frontend/src/Components/layout/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { SidebarData } from "./SidebarData.jsx";
import LogoutIcon from "@mui/icons-material/Logout";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();

  // Aun no hay autenticacion: el boton se conserva por diseno y solo
  // devuelve a la pantalla inicial.
  const handleLogout = () => navigate("/", { replace: true });

  return (
    //imagen o logo
    <aside className="Sidebar">
      <div className="Sidebar-logo">
        <DirectionsCarIcon fontSize="large" />
        <span>Auto Colombia</span>
      </div>
      <nav className="Sidebar-nav">
        <ul className="SidebarList">
          {SidebarData.map((item) => (
            <li key={item.link}>
              <NavLink
                to={item.link}
                // "title" identifica el icono cuando el sidebar esta plegado (movil)
                title={item.title}
                className={({ isActive }) => `row ${isActive ? "active" : ""}`}
              >
                <div className="icon">{item.icon}</div>
                <div className="title">{item.title}</div>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="Sidebar-footer">
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
