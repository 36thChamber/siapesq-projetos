import { describe, expect, it, vi } from "vitest";

vi.mock("georaster", () => ({ default: vi.fn() }));
vi.mock("georaster-layer-for-leaflet", () => ({ default: class {} }));
vi.mock("react-leaflet", () => ({ useMap: vi.fn() }));

import { getColorScale } from "./index";

describe("getColorScale", () => {
  it("mantém transparente somente valor não numérico", () => {
    expect(getColorScale(Number.NaN)).toBe("transparent");
  });

  it("limita valores numéricos fora da escala às cores de borda", () => {
    expect(getColorScale(-0.01)).toBe(getColorScale(0));
    expect(getColorScale(1.01)).toBe(getColorScale(1));
  });

  it("preserva cores para valores dentro do intervalo válido", () => {
    expect(getColorScale(0.5)).toMatch(/^rgba\(/);
    expect(getColorScale(1)).toMatch(/^rgba\(/);
  });
});
