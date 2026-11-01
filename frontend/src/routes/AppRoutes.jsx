// frontend/src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";
import ProtectedRoute from "../Components/ProtectedRoute.jsx";
import Sidebar from "../Components/layout/Sidebar.jsx";
import Navbar from "../Components/layout/Navbar.jsx";
import DashboardAdmin from "../pages/DashboardAdmin.jsx";
import DashboardOperador from "../pages/DashboardOperador.jsx";
import IngresoSalida from "../pages/IngresoSalida.jsx";
import HistorialAccesos from "../pages/HistorialAccesos.jsx";
import VistaVacia from "../pages/VistaVacia.jsx";
import UserListPage from "../features/users/pages/UserListPage.jsx";
import UserFormPage from "../features/users/pages/UserFormPage.jsx";
import CeldasPage from "../features/celdas/pages/CeldasPage.jsx";

const ADMIN = ["administrador"];

export default function AppRoutes() {
  const { rol } = useAuth();

  return (
    <>
      <Sidebar rol={rol} />
      <Navbar />
      <main className="App">
        <Routes>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              rol === "administrador" ? (
                <DashboardAdmin />
              ) : (
                <DashboardOperador />
              )
            }
          />
          <Route path="vehiculo" element={<HistorialAccesos />} />
          <Route path="ingreso/salida" element={<IngresoSalida />} />
          <Route path="mensualidad" element={<VistaVacia />} />

          <Route
            path="users"
            element={
              <ProtectedRoute roles={ADMIN}>
                <UserListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/new"
            element={
              <ProtectedRoute roles={ADMIN}>
                <UserFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/:id/edit"
            element={
              <ProtectedRoute roles={ADMIN}>
                <UserFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="celdas"
            element={
              <ProtectedRoute roles={ADMIN}>
                <CeldasPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </>
  );
}
