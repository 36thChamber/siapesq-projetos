import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SubscriptionSummary from "./index";
import { PlatformThemeProvider } from "@/context/PlatformThemeContext";

describe("SubscriptionSummary", () => {
  it("exibe o plano ativo recebido da consulta", () => {
    render(
      <PlatformThemeProvider>
        <SubscriptionSummary
          currentPlan={{
            planName: "Professional",
            status: "ativa",
            expiresAt: "2026-11-01T00:00:00.000Z",
            price: 49.9,
          }}
          onManage={vi.fn()}
        />
      </PlatformThemeProvider>,
    );

    expect(screen.getByText("Professional")).toBeTruthy();
    expect(screen.getByText("Ativa")).toBeTruthy();
    expect(screen.queryByText("Você não possui uma assinatura ativa.")).toBeNull();
  });

  it("mostra estado vazio quando não existe assinatura", () => {
    render(
      <PlatformThemeProvider>
        <SubscriptionSummary currentPlan={null} onManage={vi.fn()} />
      </PlatformThemeProvider>,
    );

    expect(screen.getByText("Você não possui uma assinatura ativa.")).toBeTruthy();
  });

  it("mostra falha de consulta sem informar que não há assinatura", () => {
    render(
      <PlatformThemeProvider>
        <SubscriptionSummary
          currentPlan={null}
          error="Não foi possível carregar as informações da assinatura."
          onManage={vi.fn()}
        />
      </PlatformThemeProvider>,
    );

    expect(screen.getByRole("alert").textContent).toContain("Não foi possível carregar");
    expect(screen.queryByText("Você não possui uma assinatura ativa.")).toBeNull();
  });
});
