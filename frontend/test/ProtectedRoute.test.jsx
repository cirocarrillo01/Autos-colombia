// frontend/test/ProtectedRoute.test.jsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../src/Components/ProtectedRoute";
import { useAuth } from "../src/features/auth/context/AuthContext";

vi.mock("../src/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("ProtectedRoute", () => {
  it("debería mostrar loading si se está cargando", () => {
    useAuth.mockReturnValue({ loading: true });
    render(
      <MemoryRouter>
        <ProtectedRoute><div>Acceso</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText(/cargando…/i)).toBeInTheDocument();
  });

  it("debería redirigir a /login si no está logueado", () => {
    useAuth.mockReturnValue({ isLoggedIn: false, loading: false });
    
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute><div>Acceso</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Redirigido a Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/redirigido a login/i)).toBeInTheDocument();
    expect(screen.queryByText(/acceso/i)).not.toBeInTheDocument();
  });

  it("debería renderizar children si está logueado y sin restricciones de rol", () => {
    useAuth.mockReturnValue({ isLoggedIn: true, loading: false, rol: "operador" });
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute><div>Acceso</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/acceso/i)).toBeInTheDocument();
  });

  it("debería redirigir si no tiene el rol necesario", () => {
    useAuth.mockReturnValue({ isLoggedIn: true, loading: false, rol: "operador" });
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute roles={["administrador"]}><div>Acceso</div></ProtectedRoute>} />
          <Route path="/dashboard" element={<div>Redirigido a Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/redirigido a dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/acceso/i)).not.toBeInTheDocument();
  });
});
