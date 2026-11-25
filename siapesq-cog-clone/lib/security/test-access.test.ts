import { expect, it } from "vitest";
import { testAccessAllowed } from "./test-access";
it("protects a configured test deployment and fails closed on partial configuration", () => {
  expect(testAccessAllowed(null)).toBe(true);
  expect(testAccessAllowed(null, "demo", "fixture")).toBe(false);
  expect(testAccessAllowed("Basic " + Buffer.from("demo:fixture").toString("base64"), "demo", "fixture")).toBe(true);
  expect(testAccessAllowed("Basic " + Buffer.from("demo:wrong").toString("base64"), "demo", "fixture")).toBe(false);
  expect(testAccessAllowed(null, "demo")).toBe(false);
});
