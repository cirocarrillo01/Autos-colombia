// frontend/src/Components/layout/Navbar.jsx
import PersonIcon from "@mui/icons-material/Person";
import "./Navbar.css";

function Navbar() {
  return (
    <header className="Navbar">
      <div className="Navbar-turnos">
        <span className="Navbar-turnos-label">Turno abierto</span>
      </div>

      <div className="Navbar-user-icon">
        <PersonIcon />
      </div>

      <span className="Navbar-user-name">Users-operador</span>
    </header>
  );
}

export default Navbar;
