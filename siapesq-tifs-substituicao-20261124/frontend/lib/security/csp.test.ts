import { expect, it } from "vitest";
import { contentSecurityPolicy } from "./csp";

it("requires a nonce and disables inline/eval scripts in production", () => {
  const policy = contentSecurityPolicy("a2VlcC1ub25jZXMtcGVyLXJlcXVlc3Q=", false, true);
  const scripts = policy.split("; ").find(value => value.startsWith("script-src"))!;
  expect(scripts).toContain("'nonce-");
  expect(scripts).not.toContain("unsafe-inline");
  expect(scripts).not.toContain("unsafe-eval");
  expect(policy).toContain("upgrade-insecure-requests");
  expect(() => contentSecurityPolicy("'; injected", false)).toThrow();
});

it("allows the development debugger without weakening the production policy", () => {
  expect(contentSecurityPolicy("a2VlcC1ub25jZXMtcGVyLXJlcXVlc3Q=", true)).toContain("'unsafe-eval'");
  expect(contentSecurityPolicy("a2VlcC1ub25jZXMtcGVyLXJlcXVlc3Q=", false)).not.toContain("ws:");
});
