// frontend/src/App.jsx
import { Routes, Route } from "react-router-dom";
import Sidebar from "./Components/Sidebar.jsx";
import Navbar from "./Components/Navbar.jsx";
import FormulariosConsulta from "./Components/FormulariosConsulta.jsx";
import VistaVacia from "./Components/VistaVacia.jsx";
import "./App.css";

function App() {
  return (
    <>
      <Sidebar />
      <Navbar />
      <main className="App">
        <Routes>
          <Route path="/ingreso/salida" element={<FormulariosConsulta />} />
          <Route path="/dashboard" element={<VistaVacia />} />
          <Route path="/vehiculo" element={<VistaVacia />} />
          <Route path="/mensualidad" element={<VistaVacia />} />
          <Route index element={<VistaVacia />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
