import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cogExpiry, useCogUrlRefresh } from "./useCogUrlRefresh";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-13T12:00:00Z")); });
afterEach(() => vi.useRealTimers());
const due = () => [{ id: "a", url: "signed-old", renewAt: Date.now() + 10000 }];
describe("COG URL renewal", () => {
  it("renews before expiry and cleans up on unmount", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const resources = due();
    const view = renderHook(() => useCogUrlRefresh(resources, refresh));
    await act(async () => vi.advanceTimersByTimeAsync(9000)); expect(refresh).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(1000)); expect(refresh).toHaveBeenCalledExactlyOnceWith("a");
    view.unmount(); await vi.advanceTimersByTimeAsync(30000); expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("does not start duplicate requests on focus or timer while renewal is pending", async () => {
    const resources = [{ id: "a", url: "old", renewAt: 0 }];
    let settle!: () => void;
    const refresh = vi.fn(() => new Promise<void>(resolve => { settle = resolve; }));
    const view = renderHook(() => useCogUrlRefresh(resources, refresh));
    act(() => window.dispatchEvent(new Event("focus")));
    await act(async () => vi.advanceTimersByTimeAsync(20000)); expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => settle()); view.unmount();
  });
  it("rate-limits transient failures and stops retrying denied resources", async () => {
    const resources = [{ id: "a", url: "old", renewAt: 0 }];
    const refresh = vi.fn().mockRejectedValueOnce(new Error("offline")).mockRejectedValue({ response: { status: 403 } });
    const view = renderHook(() => useCogUrlRefresh(resources, refresh));
    await act(async () => vi.advanceTimersByTimeAsync(14000)); expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1000)); expect(refresh).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(60000)); expect(refresh).toHaveBeenCalledTimes(2);
    view.unmount();
  });
  it("stops renewing removed selections and disabled sessions", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const resources = due();
    const view = renderHook(({ selected, enabled }) => useCogUrlRefresh(selected, refresh, enabled), { initialProps: { selected: resources, enabled: true } });
    view.rerender({ selected: [], enabled: true });
    await act(async () => vi.advanceTimersByTimeAsync(20000)); expect(refresh).not.toHaveBeenCalled();
    view.rerender({ selected: resources, enabled: false });
    await act(async () => vi.advanceTimersByTimeAsync(20000)); expect(refresh).not.toHaveBeenCalled(); view.unmount();
  });
  it("uses current deadlines when a tab wakes up", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined); const resources = due();
    const view = renderHook(() => useCogUrlRefresh(resources, refresh));
    vi.setSystemTime(Date.now() + 60000);
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(refresh).toHaveBeenCalledExactlyOnceWith("a"); view.unmount();
  });
  it("reserves a minute for one-hour URLs and handles short lifetimes", () => {
    expect(cogExpiry(3600, 0)).toEqual({ expiresAt: 3600000, renewAt: 3540000 });
    expect(cogExpiry(20, 0)).toEqual({ expiresAt: 20000, renewAt: 16000 });
    expect(() => cogExpiry(0)).toThrow();
  });
});

it("limita falhas de tiles mesmo quando cada tentativa recebe uma URL diferente", async () => {
  const refresh = vi.fn().mockResolvedValue(undefined);
  const resources = [{ id: "a", url: "old", renewAt: Date.now() + 3600000 }];
  const view = renderHook(({ selected }) => useCogUrlRefresh(selected, refresh), { initialProps: { selected: resources } });
  await act(async () => view.result.current("a"));
  view.rerender({ selected: [{ ...resources[0], url: "new" }] });
  await act(async () => view.result.current("a"));
  expect(refresh).toHaveBeenCalledTimes(1);
  await act(async () => vi.advanceTimersByTimeAsync(14000)); expect(refresh).toHaveBeenCalledTimes(1);
  await act(async () => vi.advanceTimersByTimeAsync(1000)); expect(refresh).toHaveBeenCalledTimes(2);
  view.unmount();
});
