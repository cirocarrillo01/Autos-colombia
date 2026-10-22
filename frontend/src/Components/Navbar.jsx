// frontend/src/Components/Navbar.jsx
import PersonIcon from "@mui/icons-material/Person";
import "./Navbar.css";

function Navbar() {
  return (
    <header className="Navbar">
      {/* Turnos abiertos - cuadrícula verde claro */}
      <div className="Navbar-turnos">
        <span className="Navbar-turnos-label">Turno abierto</span>
      </div>

      {/* Icono de usuario (gris) */}
      <div className="Navbar-user-icon">
        <PersonIcon />
      </div>

      {/* Texto Users-operador (gris) */}
      <span className="Navbar-user-name">Users-operador</span>
    </header>
  );
}

export default Navbar;
