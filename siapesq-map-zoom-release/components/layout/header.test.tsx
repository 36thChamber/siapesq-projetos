import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";

import { PlatformThemeProvider } from "@/context/PlatformThemeContext";
import Header from "./header";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  logout: vi.fn(async () => true),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => (
    <span role="img" aria-label={alt} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      nome: "Usuário Teste",
      tipo_usuario: "PESQUISADOR",
    },
    logout: mocks.logout,
    loading: false,
    logoutPending: false,
    logoutError: null,
  }),
}));

function renderHeader(reloadPage = vi.fn()) {
  const view = render(
    <PlatformThemeProvider>
      <Header reloadPage={reloadPage} />
    </PlatformThemeProvider>,
  );

  return { ...view, reloadPage };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("platformState", "RS");
  mocks.push.mockClear();
  mocks.logout.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Header - troca de estado", () => {
  it("exibe Perfil, Trocar estado e Sair e persiste a seleção pelo contexto", () => {
    const { reloadPage, getByRole } = renderHeader();

    fireEvent.click(getByRole("button", { name: /Olá Usuário/ }));

    const menu = getByRole("menu", { name: "Menu do usuário" });
    expect(
      within(menu).getAllByRole("menuitem").map((item) =>
        item.textContent?.replace(/\s+/g, " ").trim(),
      ),
    ).toEqual(["Perfil", "Trocar estado›", "Sair"]);

    fireEvent.click(
      within(menu).getByRole("menuitem", { name: /Trocar estado/ }),
    );

    expect(
      within(getByRole("menu", { name: "Trocar estado" }))
        .getAllByRole("menuitemradio")
        .map((item) => item.textContent?.replace("✓", "").trim()),
    ).toEqual(["Rio Grande do Sul", "Espírito Santo", "Minas Gerais"]);
    expect(
      getByRole("menuitemradio", {
        name: "Rio Grande do Sul",
      }).getAttribute("aria-checked"),
    ).toBe("true");

    fireEvent.click(
      getByRole("menuitemradio", { name: "Espírito Santo" }),
    );

    expect(localStorage.getItem("platformState")).toBe("ES");
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it("permite trocar o estado pelo menu responsivo", () => {
    const { reloadPage, getByRole } = renderHeader();

    fireEvent.click(getByRole("button", { name: "Menu do usuário" }));
    fireEvent.click(getByRole("button", { name: "Trocar estado" }));
    fireEvent.click(getByRole("menuitemradio", { name: "Minas Gerais" }));

    expect(localStorage.getItem("platformState")).toBe("MG");
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });
});
