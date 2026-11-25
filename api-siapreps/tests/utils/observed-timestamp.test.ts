import { describe, expect, it } from "vitest";
import {
  OBSERVED_TIMESTAMP_FUTURE_TOLERANCE_MS,
  parseObservedTimestamp,
} from "../../src/utils/observed-timestamp";

describe("parseObservedTimestamp", () => {
  const now = new Date("2026-10-31T12:00:00.000Z");

  it("preserva um evento offline antigo e normaliza offsets para UTC", () => {
    expect(parseObservedTimestamp("2026-10-31T06:00:00-03:00", now).toISOString())
      .toBe("2026-10-31T09:00:00.000Z");
    expect(parseObservedTimestamp("2026-10-31T09:00:00Z", now).toISOString())
      .toBe("2026-10-31T09:00:00.000Z");
  });

  it("aceita a borda da tolerância e rejeita timestamp além dela", () => {
    const boundary = new Date(now.getTime() + OBSERVED_TIMESTAMP_FUTURE_TOLERANCE_MS);
    expect(parseObservedTimestamp(boundary.toISOString(), now).getTime()).toBe(boundary.getTime());
    expect(() => parseObservedTimestamp(
      new Date(boundary.getTime() + 1).toISOString(), now,
    )).toThrow(/5 minutos/);
  });

  it.each([
    "2026-10-31T09:00:00",
    "invalid",
    "2026-02-30T09:00:00Z",
    "2026-10-31T09:00:00.1234Z",
    "2026-10-31T09:00:00+14:30",
    "1969-12-31T23:59:59Z",
  ])("rejeita timestamp inválido, sem offset ou anterior ao epoch: %s", (value) => {
    expect(() => parseObservedTimestamp(value, now)).toThrow();
  });
});
