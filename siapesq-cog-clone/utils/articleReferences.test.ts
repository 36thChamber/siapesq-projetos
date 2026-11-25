import { describe, expect, it } from "vitest";
import type { Artigo } from "@/services/types/artigo.types";
import { processArticleReferences } from "./articleReferences";

const article: Artigo = {
  id_artigo: 42,
  artigo: "https://journal.example/article-42",
  referencia_texto: "Silva et al., 2024",
  referencia_completa: "Silva et al., 2024",
  nome_especie: "Espécie teste",
  nome_artigo: "Artigo teste",
};

describe("processArticleReferences", () => {
  it("usa o ID para criar o link, mas não o exibe na referência", () => {
    const result = processArticleReferences("Descrição (Silva et al., 2024 #42).", [article]);

    expect(result).toContain('<a href="https://journal.example/article-42"');
    expect(result).toContain(">(Silva et al., 2024)</a>");
    expect(result).not.toContain("#42");
  });

  it("remove o ID da exibição mesmo quando o artigo correspondente não é encontrado", () => {
    const result = processArticleReferences("Descrição (Silva et al., 2024 #999).", []);

    expect(result).toContain("(Silva et al., 2024)");
    expect(result).not.toContain("#999");
  });
});
