// frontend/test/HistorialAccesos.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HistorialAccesos from "../src/pages/HistorialAccesos";
import * as api from "../src/services/api";

vi.mock("../src/services/api", () => ({
  listarAccesos: vi.fn(),
}));

describe("HistorialAccesos", () => {
  it("debería mostrar registros de historial", async () => {
    api.listarAccesos.mockResolvedValue({
      rows: [
        { 
          id_acceso: 1, 
          placa: "ABC123", 
          propietario_nombre: "Juan", 
          celda: "A1", 
          fecha_ingreso: "2026-11-10T10:00:00Z" 
        }
      ],
      total: 1,
    });

    render(<HistorialAccesos />);

    await waitFor(() => {
      expect(screen.getByText("ABC123")).toBeInTheDocument();
      expect(screen.getByText("Juan")).toBeInTheDocument();
    });
  });
});
