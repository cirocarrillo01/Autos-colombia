// frontend/src/Components/layout/Navbar.jsx
import { useAuth } from "../../features/auth/context/AuthContext";
import PersonIcon from "@mui/icons-material/Person";
import "./Navbar.css";

function Navbar() {
  const { usuario } = useAuth();

  return (
    <header className="Navbar">
      <div className="Navbar-turnos">
        <span className="Navbar-turnos-label">Turno abierto</span>
      </div>
      <div className="Navbar-user-icon">
        <PersonIcon />
      </div>
      <span
        className="Navbar-user-name"
        title={
          usuario?.nombreCompleto ?? usuario?.usuario_login ?? "Usuario"
        }
      >
        {usuario?.nombreCompleto ?? usuario?.usuario_login ?? "Usuario"}
      </span>
    </header>
  );
}

export default Navbar;
