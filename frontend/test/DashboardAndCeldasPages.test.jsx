// frontend/test/DashboardAndCeldasPages.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DashboardAdmin from "../src/pages/DashboardAdmin";
import DashboardOperador from "../src/pages/DashboardOperador";
import CeldasPage from "../src/features/celdas/pages/CeldasPage";
import { useAuth } from "../src/features/auth/context/AuthContext";
import * as api from "../src/services/api";

vi.mock("../src/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../src/services/api", () => ({
  resumenCeldas: vi.fn(),
  listarUsuarios: vi.fn(),
  listarCeldas: vi.fn(),
  celdasPorBloque: vi.fn(),
  listarTiposVehiculo: vi.fn(),
}));

describe("Dashboards y CeldasPage", () => {
  it("debería renderizar DashboardAdmin correctamente", async () => {
    useAuth.mockReturnValue({ usuario: { nombreCompleto: "Admin Master" } });
    api.resumenCeldas.mockResolvedValue({ totales: { total: 10, libres: 5, ocupadas: 5, no_disponibles: 0 }, porTipo: [] });
    api.listarUsuarios.mockResolvedValue({ total: 3 });

    render(
      <MemoryRouter>
        <DashboardAdmin />
      </MemoryRouter>
    );

    expect(screen.getByText(/panel de administración/i)).toBeInTheDocument();
    expect(screen.getByText(/bienvenido, Admin Master/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/gestionar usuarios \(3\)/i)).toBeInTheDocument();
    });
  });

  it("debería renderizar DashboardOperador correctamente", async () => {
    useAuth.mockReturnValue({ usuario: { usuario_login: "op_test" } });
    api.resumenCeldas.mockResolvedValue({ totales: { total: 10, libres: 5, ocupadas: 5, no_disponibles: 0 }, porTipo: [] });

    render(
      <MemoryRouter>
        <DashboardOperador />
      </MemoryRouter>
    );

    expect(screen.getByText(/panel de operador/i)).toBeInTheDocument();
    expect(screen.getByText(/bienvenido, op_test/i)).toBeInTheDocument();
  });

  it("debería renderizar CeldasPage correctamente", async () => {
    api.listarCeldas.mockResolvedValue({ rows: [{ id_celda: 1, codigo: "A1", tipo: "carro", estado: "libre", activa: true }], total: 1 });
    api.celdasPorBloque.mockResolvedValue([{ bloque: "A", celdas: [{ id_celda: 1, codigo: "A1", tipo: "carro", estado: "libre" }] }]);
    api.resumenCeldas.mockResolvedValue({ totales: { total: 1, libres: 1, ocupadas: 0, no_disponibles: 0 }, porTipo: [] });
    api.listarTiposVehiculo.mockResolvedValue([{ id_tipo_vehiculo: 1, nombre: "Carro" }]);

    render(
      <MemoryRouter>
        <CeldasPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Celdas")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("A1")).toBeInTheDocument();
    });
  });
});
