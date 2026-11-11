// frontend/test/ResumenCeldas.test.jsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ResumenCeldas from "../src/Components/ResumenCeldas";

describe("ResumenCeldas", () => {
  it("debería renderizar las estadísticas totales correctamente", () => {
    const mockResumen = {
      totales: { total: 10, libres: 5, ocupadas: 3, no_disponibles: 2 },
      porTipo: [{ tipo: "carro", total: 10, libres: 5, ocupadas: 3, no_disponibles: 2 }],
    };

    render(<ResumenCeldas resumen={mockResumen} />);

    expect(screen.getAllByText("10").length).toBe(2);
    expect(screen.getAllByText("5").length).toBe(2);
    expect(screen.getAllByText("3").length).toBe(2);
    expect(screen.getAllByText("2").length).toBe(2);
  });

  it("debería devolver null si no hay datos de resumen", () => {
    const { container } = render(<ResumenCeldas resumen={null} />);
    expect(container.firstChild).toBeNull();
  });
});
