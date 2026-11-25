import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import HomeSpeciesMosaic from "./HomeSpeciesMosaic";

vi.mock("@/context/PlatformThemeContext", () => ({
  usePlatformTheme: () => ({ theme: { colors: { gray: { 200: "#e5e7eb" }, primary: { 500: "#2563eb" } } } }),
}));

const images = Array.from({ length: 9 }, (_, i) => ({
  src: `https://img/${i + 1}`,
  alt: `Foto ${i + 1}`,
  caption: `Espécie ${i + 1}`,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("HomeSpeciesMosaic", () => {
  it("forma o mosaico quadrado e apresenta até sete miniaturas quadradas", () => {
    const view = render(<HomeSpeciesMosaic images={images} autoPlay={false} />);
    const region = view.getByRole("region");
    expect(region.className).toContain("grid-cols-4");
    expect(region.className).toContain("grid-rows-4");
    expect(view.getByRole("img", { name: "Foto 1" }).parentElement?.className).toContain("col-span-3");
    expect(view.getAllByRole("button")).toHaveLength(7);
    view.getAllByRole("button").forEach((button) => {
      expect(button.className).toContain("aspect-square");
    });
  });

  it("mostra as imagens seguintes nas miniaturas e seleciona clicada", () => {
    const view = render(<HomeSpeciesMosaic images={images} autoPlay={false} />);
    fireEvent.click(view.getByRole("button", { name: "Selecionar imagem: Foto 3" }));
    expect(view.getByRole("img", { name: "Foto 3" })).toBeTruthy();
    expect(view.getAllByRole("button")).toHaveLength(7);
  });

  it("avança a imagem principal em 5 segundos mantendo mosaico navegável", () => {
    vi.useFakeTimers();
    const view = render(<HomeSpeciesMosaic images={images} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(view.getByRole("img", { name: "Foto 2" })).toBeTruthy();
    expect(view.getAllByRole("button")).toHaveLength(7);
  });
});
