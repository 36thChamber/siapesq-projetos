import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import HomeSpeciesGallery from "./HomeSpeciesGallery";

const mocks = vi.hoisted(() => ({
  getImageListOfSpecies: vi.fn(),
}));

vi.mock("@/services/api/gbif.service", () => ({
  getImageListOfSpecies: mocks.getImageListOfSpecies,
}));

vi.mock("@/context/PlatformThemeContext", () => ({
  usePlatformTheme: () => ({
    theme: {
      colors: {
        gray: { 100: "#f3f4f6", 200: "#e5e7eb" },
        muted: "#6b7280",
        primary: { 500: "#2563eb" },
      },
    },
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HomeSpeciesGallery", () => {
  it("exibe skeleton enquanto carrega", () => {
    mocks.getImageListOfSpecies.mockReturnValue(new Promise(() => {}));
    const view = render(<HomeSpeciesGallery />);

    expect(view.getByRole("status", { name: "Carregando imagens das espécies" })).toBeTruthy();
  });

  it("renderiza a galeria navegável e ignora espécies sem imagem", async () => {
    mocks.getImageListOfSpecies.mockResolvedValue([
      { nome_cientifico: "Puma concolor", gbifImage: "https://img/puma" },
      { nome_cientifico: "Nasua nasua", gbifImage: null },
      { nome_cientifico: "Turdus rufiventris", gbifImage: "https://img/turdus" },
    ]);
    const view = render(<HomeSpeciesGallery />);

    const main = await view.findByRole("img", { name: "Foto de Puma concolor" });
    expect(view.queryByRole("img", { name: /Nasua/ })).toBeNull();

    fireEvent.click(view.getByRole("button", { name: "Selecionar imagem: Foto de Turdus rufiventris" }));

    await waitFor(() => expect(view.getByRole("img", { name: "Foto de Turdus rufiventris" })).toBeTruthy());
    expect(main.isConnected).toBe(false);
  });

  it("mostra fallback quando nenhuma espécie tem imagem", async () => {
    mocks.getImageListOfSpecies.mockResolvedValue([
      { nome_cientifico: "Puma concolor", gbifImage: null },
    ]);
    const view = render(<HomeSpeciesGallery />);

    expect(await view.findByText("Nenhuma imagem disponível no momento.")).toBeTruthy();
  });

  it("mostra mensagem de erro quando o carregamento falha", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getImageListOfSpecies.mockRejectedValue(new Error("falha"));
    const view = render(<HomeSpeciesGallery />);

    await waitFor(() => {
      expect(view.getByRole("alert").textContent).toContain(
        "Não foi possível carregar as imagens das espécies.",
      );
    });
  });
});
