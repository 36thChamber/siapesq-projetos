import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = resolve(process.cwd(), "src");

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory()
      ? listTypeScriptFiles(entryPath)
      : entry.name.endsWith(".ts")
        ? [entryPath]
        : [];
  });
}

describe("arquitetura baseada em services", () => {
  it("nao possui a camada src/controllers", () => {
    expect(existsSync(join(srcRoot, "controllers"))).toBe(false);
  });

  it("nao possui imports ou classes de controller no codigo fonte", () => {
    const references = listTypeScriptFiles(srcRoot)
      .filter((file) => /(?:\/|\\)controllers(?:\/|\\)|\b\w+Controller\b/.test(readFileSync(file, "utf8")))
      .map((file) => relative(srcRoot, file));

    expect(references).toEqual([]);
  });

  it("mantem os adaptadores HTTP ativos em services/http", () => {
    const httpServices = readdirSync(join(srcRoot, "services", "http"));

    expect(httpServices).toEqual(expect.arrayContaining([
      "analises-http-service.ts",
      "artes-de-pesca-http-service.ts",
      "campos-arte-de-pesca-http-service.ts",
      "embarcacoes-http-service.ts",
      "especies-http-service.ts",
      "fundos-http-service.ts",
      "incidentes-http-service.ts",
      "iscas-http-service.ts",
      "lances-http-service.ts",
      "missoes-http-service.ts",
      "ocorrencias-lance-http-service.ts",
      "portos-http-service.ts",
      "relatorios-http-service.ts",
      "usuarios-ativos-http-service.ts",
      "usuarios-http-service.ts",
    ]));
  });
});
