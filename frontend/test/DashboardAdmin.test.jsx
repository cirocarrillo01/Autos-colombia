// frontend/test/DashboardAdmin.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DashboardAdmin from "../src/pages/DashboardAdmin";
import { useAuth } from "../src/features/auth/context/AuthContext";
import * as api from "../src/services/api";

vi.mock("../src/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../src/services/api", () => ({
  resumenCeldas: vi.fn(),
  listarUsuarios: vi.fn(),
}));

describe("DashboardAdmin", () => {
  it("debería cargar y mostrar el panel de administración", async () => {
    useAuth.mockReturnValue({ usuario: { nombreCompleto: "Admin Test" } });
    api.resumenCeldas.mockResolvedValue({
      totales: { total: 10, libres: 5, ocupadas: 3, no_disponibles: 2 },
      porTipo: [],
    });
    api.listarUsuarios.mockResolvedValue({ total: 5 });

    render(
      <MemoryRouter>
        <DashboardAdmin />
      </MemoryRouter>
    );

    expect(screen.getByText(/bienvenido, Admin Test/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/gestionar usuarios \(5\)/i)).toBeInTheDocument();
    });
  });
});
