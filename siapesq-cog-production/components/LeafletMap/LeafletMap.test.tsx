import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeafletMap from "./LeafletMap";

const map = { setView: vi.fn(), fitBounds: vi.fn() };
const { leafletIcon } = vi.hoisted(() => ({ leafletIcon: vi.fn((options) => options) }));

vi.mock("leaflet", () => ({
  default: { Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } }, icon: leafletIcon },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children, scrollWheelZoom }: { children: React.ReactNode; scrollWheelZoom?: boolean }) => (
    <div data-testid="occurrence-map" data-scroll-wheel-zoom={String(scrollWheelZoom)}>{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, icon }: { children: React.ReactNode; icon?: { iconSize?: number[] } }) => (
    <div data-testid="occurrence-marker" data-icon-size={icon?.iconSize?.join("x")}>{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => map,
}));

vi.mock("../MapLayerSwitcher/MapLayerSwitcher", () => ({
  default: ({ baseMap, setBaseMap }: { baseMap: string; setBaseMap: (value: "google") => void }) => (
    <button type="button" onClick={() => setBaseMap("google")}>{baseMap}</button>
  ),
}));

vi.mock("@/config/platformThemes", () => ({
  getPlatformTheme: () => ({ colors: {} }),
}));

describe("LeafletMap de ocorrências", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renderiza os marcadores, enquadra os pontos e mantém o mapa-base ao atualizar", () => {
    const { rerender } = render(
      <LeafletMap points={[
        { latitude: -30, longitude: -51, description: "A" },
        { latitude: -29, longitude: -50, description: "B" },
      ]} />,
    );

    expect(screen.getAllByTestId("occurrence-marker")).toHaveLength(2);
    expect(screen.getAllByTestId("occurrence-marker")[0].getAttribute("data-icon-size")).toBe("18x30");
    expect(screen.getByTestId("occurrence-map").getAttribute("data-scroll-wheel-zoom")).toBe("false");
    expect(map.fitBounds).toHaveBeenCalledWith([[-30, -51], [-29, -50]], expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "openstreetmap" }));

    rerender(<LeafletMap points={[{ latitude: -20, longitude: -40, description: "C" }]} />);

    expect(screen.getAllByTestId("occurrence-marker")).toHaveLength(1);
    expect(screen.getByRole("button").textContent).toBe("google");
    expect(map.setView).toHaveBeenCalledWith([-20, -40], 10);
  });
});
