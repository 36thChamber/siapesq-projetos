import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import MapViewport from "./MapViewport";
const { map } = vi.hoisted(() => ({ map: { setView: vi.fn() } }));
vi.mock("react-leaflet", () => ({ useMap: () => map }));
it("applies arriving species coordinates while preserving user navigation on unrelated renders", () => {
  const view = render(<MapViewport center={[-30, -50]} zoom={7} />);
  expect(map.setView).toHaveBeenLastCalledWith([-30, -50], 7, { animate: false });
  view.rerender(<MapViewport center={[-23, -50]} zoom={7} />);
  expect(map.setView).toHaveBeenCalledTimes(2);
  view.rerender(<MapViewport center={[-23, -50]} zoom={7} />);
  expect(map.setView).toHaveBeenCalledTimes(2);
});
