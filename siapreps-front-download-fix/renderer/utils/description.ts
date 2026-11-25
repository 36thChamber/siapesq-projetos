import { get_artigo_by_id } from "../controllers/artigos-controller";

export async function addArticlesInDescription(
  descricao: string,
  token: string
): Promise<string> {
  if (!descricao) return "";

  // agora consome '(' e ')'
  const regex = /\(\s*([^();]+?),\s*(\d+)\s*;?\s*\)/g;

  let match;
  let descricaoFinal = descricao;

  const artigosCache = new Map<number, string>();

  while ((match = regex.exec(descricao)) !== null) {
    const fullMatch = match[0];
    const textoReferencia = match[1].trim();
    const artigoId = Number(match[2]);

    if (!artigoId) continue;

    if (!artigosCache.has(artigoId)) {
      try {
        const artigo = await get_artigo_by_id(token, artigoId);
        artigosCache.set(artigoId, artigo.artigo);
      } catch {
        continue;
      }
    }

    const artigoUrl = artigosCache.get(artigoId);
    if (!artigoUrl) continue;

    const hyperlink = `
    <a href="${artigoUrl}"
      target="_blank"
      rel="noopener noreferrer"
      class="text-primary hover:underline">
      (${textoReferencia})
    </a>`;

    descricaoFinal = descricaoFinal.replace(fullMatch, hyperlink);
  }

  return descricaoFinal;
}
