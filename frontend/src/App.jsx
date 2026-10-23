// frontend/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Components/layout/Sidebar.jsx";
import Navbar from "./Components/layout/Navbar.jsx";
import IngresoSalida from "./pages/IngresoSalida.jsx";
import VistaVacia from "./pages/VistasVacia.jsx";

function App() {
  return (
    <>
      <Sidebar />
      <Navbar />
      <main className="App">
        <Routes>
          <Route index element={<Navigate to="/ingreso/salida" replace />} />
          <Route path="/ingreso/salida" element={<IngresoSalida />} />
          {/* Secciones del menu que aun no tienen contenido */}
          <Route path="/dashboard" element={<VistaVacia />} />
          <Route path="/vehiculo" element={<VistaVacia />} />
          <Route path="/mensualidad" element={<VistaVacia />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
