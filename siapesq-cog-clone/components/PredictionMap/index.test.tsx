import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PredictionMap from ".";
import type { PredictionMapProps } from "@/services/types/prediction.types";

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/context/PlatformThemeContext", () => ({
  usePlatformTheme: () => ({
    theme: { colors: { primary: { 500: "#345" }, titleColor: "#111" } },
  }),
}));

vi.mock("@/components/MapLayerSwitcher/MapLayerSwitcher", () => ({ default: () => null }));

function props(overrides: Partial<PredictionMapProps> = {}): PredictionMapProps {
  return {
    period: "annual",
    selectedScenario: "",
    availableScenarios: [],
    futureYear: 2050,
    loadingAnalyses: false,
    loadingTif: false,
    downloadingTif: false,
    canDownloadTif: false,
    analysesError: null,
    tiffError: null,
    downloadError: null,
    onPeriodChange: vi.fn(),
    onScenarioChange: vi.fn(),
    onFutureYearChange: vi.fn(),
    onRetryAnalyses: vi.fn(),
    onRetryTif: vi.fn(),
    onTiffRenderError: vi.fn(),
    onDownloadTif: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("botão Baixar análise", () => {
  it("fica desabilitado sem análise selecionada e habilita com uma análise", () => {
    const { rerender } = render(<PredictionMap {...props()} />);
    expect(screen.getByRole("button", { name: "Baixar análise" })).toHaveProperty("disabled", true);

    rerender(<PredictionMap {...props({ canDownloadTif: true })} />);
    expect(screen.getByRole("button", { name: "Baixar análise" })).toHaveProperty("disabled", false);
  });

  it("mostra o estado de download e não permite um segundo clique", () => {
    const onDownloadTif = vi.fn().mockResolvedValue(undefined);
    render(<PredictionMap {...props({ canDownloadTif: true, downloadingTif: true, onDownloadTif })} />);

    const button = screen.getByRole("button", { name: "Baixando..." });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(onDownloadTif).not.toHaveBeenCalled();
  });

  it("dispara o handler do download no botão existente", () => {
    const onDownloadTif = vi.fn().mockResolvedValue(undefined);
    render(<PredictionMap {...props({ canDownloadTif: true, onDownloadTif })} />);

    fireEvent.click(screen.getByRole("button", { name: "Baixar análise" }));
    expect(onDownloadTif).toHaveBeenCalledTimes(1);
  });
});

describe("occurrence points", () => {
  it("toggles their visibility without changing the analysis map", () => {
    render(<PredictionMap {...props()} occurrencePoints={[{ latitude: -30, longitude: -51, description: "Occurrence" }]} />);

    const toggle = screen.getByRole("button", { name: "Mostrar pontos de ocorrência" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.style.backgroundColor).toBe("rgb(51, 68, 85)");

    fireEvent.click(toggle);
    const visibleToggle = screen.getByRole("button", { name: "Ocultar pontos de ocorrência" });
    expect(visibleToggle.getAttribute("aria-pressed")).toBe("true");
    expect(visibleToggle.style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(visibleToggle.style.borderColor).toBe("rgb(51, 68, 85)");
  });

  it("keeps CSV download accessible in the unified section", () => {
    const onDownloadOccurrences = vi.fn().mockResolvedValue(undefined);
    render(<PredictionMap {...props()} onDownloadOccurrences={onDownloadOccurrences} />);

    fireEvent.click(screen.getByRole("button", { name: "Baixar CSV" }));
    expect(onDownloadOccurrences).toHaveBeenCalledTimes(1);
  });
});

describe("link de monitoramento", () => {
  it("fica integrado abaixo dos botões de download no mapa de adequabilidade", () => {
    render(
      <PredictionMap
        {...props()}
        monitoringHref="/map/species-id"
        onDownloadOccurrences={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const downloadButton = screen.getByRole("button", { name: "Baixar CSV" });
    const monitoringLink = screen.getByRole("link", { name: /Ir para área de monitoramento/ });
    expect(monitoringLink.getAttribute("href")).toBe("/map/species-id");
    expect(monitoringLink.parentElement?.firstElementChild?.contains(downloadButton)).toBe(true);
    expect(monitoringLink.parentElement?.lastElementChild).toBe(monitoringLink);
  });
});
