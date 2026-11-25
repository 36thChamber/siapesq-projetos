import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { ReusableDropdown, type DropdownItem } from "./dropdown";

const items: DropdownItem[] = [
  { label: "Perfil", value: "perfil" },
  {
    label: "Trocar estado",
    value: "trocar-estado",
    subItems: [
      { label: "Rio Grande do Sul", value: "RS", selected: true },
      { label: "Espírito Santo", value: "ES" },
      { label: "Minas Gerais", value: "MG" },
    ],
  },
  { label: "Sair", value: "sair" },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ReusableDropdown com submenu", () => {
  it("abre à esquerda quando não há espaço à direita e fecha ao clicar fora", () => {
    const view = render(
      <ReusableDropdown trigger={<span>Usuário</span>} items={items} />,
    );

    fireEvent.click(view.getByRole("button", { name: "Usuário" }));

    const stateItem = view.getByRole("menuitem", {
      name: /Trocar estado/,
    });
    vi.spyOn(stateItem, "getBoundingClientRect").mockReturnValue({
      left: 760,
      right: 920,
      top: 80,
      bottom: 120,
      width: 160,
      height: 40,
      x: 760,
      y: 80,
      toJSON: () => ({}),
    });
    vi.stubGlobal("innerWidth", 960);

    fireEvent.mouseEnter(stateItem);
    fireEvent.click(stateItem);

    const submenu = view.getByRole("menu", { name: "Trocar estado" });
    expect(submenu.classList.contains("right-full")).toBe(true);
    expect(
      view
        .getByRole("menuitemradio", { name: "Rio Grande do Sul" })
        .getAttribute("aria-checked"),
    ).toBe("true");

    fireEvent.mouseDown(document.body);

    expect(
      view.queryByRole("menu", { name: "Menu de opções" }),
    ).toBeNull();
  });

  it("abre à direita quando a viewport possui espaço disponível", () => {
    const view = render(
      <ReusableDropdown trigger={<span>Usuário</span>} items={items} />,
    );

    fireEvent.click(view.getByRole("button", { name: "Usuário" }));

    const stateItem = view.getByRole("menuitem", {
      name: /Trocar estado/,
    });
    vi.spyOn(stateItem, "getBoundingClientRect").mockReturnValue({
      left: 40,
      right: 200,
      top: 80,
      bottom: 120,
      width: 160,
      height: 40,
      x: 40,
      y: 80,
      toJSON: () => ({}),
    });
    vi.stubGlobal("innerWidth", 1024);

    fireEvent.click(stateItem);

    expect(
      view
        .getByRole("menu", { name: "Trocar estado" })
        .classList.contains("left-full"),
    ).toBe(true);
  });
});
