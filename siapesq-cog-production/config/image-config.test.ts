import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const configPath = require.resolve("../next.config.js");
afterEach(() => {
  vi.unstubAllEnvs();
  delete require.cache[configPath];
});

describe("Next Image remote configuration", () => {
  it("does not authorize arbitrary remote hosts for image optimization", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete require.cache[configPath];

    const nextConfig = require(configPath);
    const { hasRemoteMatch } = require("next/dist/shared/lib/match-remote-pattern");
    const domains = nextConfig.images.domains ?? [];
    const patterns = nextConfig.images.remotePatterns ?? [];

    expect(patterns).toEqual([]);
    expect(
      hasRemoteMatch(domains, patterns, new URL("https://host-nao-autorizado.example/imagem.jpg")),
    ).toBe(false);
    expect(
      hasRemoteMatch(domains, patterns, new URL("https://api.gbif.org/imagem.jpg")),
    ).toBe(false);
  });
});
