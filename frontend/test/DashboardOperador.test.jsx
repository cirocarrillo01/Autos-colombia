// frontend/test/DashboardOperador.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DashboardOperador from "../src/pages/DashboardOperador";
import { useAuth } from "../src/features/auth/context/AuthContext";
import * as api from "../src/services/api";

vi.mock("../src/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../src/services/api", () => ({
  resumenCeldas: vi.fn(),
}));

describe("DashboardOperador", () => {
  it("debería cargar y mostrar el panel de operador", async () => {
    useAuth.mockReturnValue({ usuario: { usuario_login: "operador1" } });
    api.resumenCeldas.mockResolvedValue({
      totales: { total: 8, libres: 4, ocupadas: 4, no_disponibles: 0 },
      porTipo: [],
    });

    render(
      <MemoryRouter>
        <DashboardOperador />
      </MemoryRouter>
    );

    expect(screen.getByText(/bienvenido, operador1/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/registrar ingreso \/ salida/i)).toBeInTheDocument();
    });
  });
});
