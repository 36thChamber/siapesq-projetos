import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("site icon", () => {
  it("provides a square PNG through the App Router metadata convention", () => {
    const icon = readFileSync(resolve(process.cwd(), "app/icon.png"));

    expect(icon.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(icon.readUInt32BE(16)).toBe(512);
    expect(icon.readUInt32BE(20)).toBe(512);
  });
});
