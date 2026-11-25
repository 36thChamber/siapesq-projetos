import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Species from "@/components/species";

vi.mock("@/hook/useSpeciesList", () => ({
  useSpeciesList: () => ({
    species: [],
    categoryName: "",
    selectedId: null,
    selectSpecie: vi.fn(),
    loading: false,
    error: "Não foi possível carregar as espécies.",
  }),
}));

vi.mock("@/hook/useSpeciesSidebar", () => ({
  useSpeciesSidebar: () => ({
    openSidebar: vi.fn(),
    closeSidebar: vi.fn(),
    sidebarClass: "",
  }),
}));

vi.mock("@/hook/useSpeciesImagesPreload", () => ({
  useSpeciesImagesPreload: vi.fn(),
}));

vi.mock("@/context/PlatformThemeContext",()=>({usePlatformTheme:()=>({theme:{colors:{muted:"#777"}}})}));

describe("Species", () => {
  it("exibe a falha da API em vez de tratá-la como lista vazia", () => {
    render(<Species category="grupo-1" onSelectSpecie={vi.fn()} />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Não foi possível carregar as espécies.",
    );
    expect(screen.queryByText("Nenhuma espécie encontrada.")).toBeNull();
  });
});
