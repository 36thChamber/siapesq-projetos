import type { Artigo } from "@/services/types/artigo.types";
import { escapeHtmlAttr, isSafeHttpUrl, sanitizeHtml } from "@/utils/sanitizeHtml";

/** Links article references and keeps their internal #id out of the visible text. */
export function processArticleReferences(text: string, articles: Artigo[]): string {
  let processedText = text;
  const matches = [...text.matchAll(/\(([^)]+)\)/g)];

  matches.forEach((match) => {
    const fullMatch = match[0];
    const referenceContent = match[1];
    const articleId = referenceContent.match(/#\s*([a-z\d_-]+)/i)?.[1]
      ?? referenceContent.match(/(\d+)/g)?.at(-1);
    const visibleReference = fullMatch
      .replace(/\s*#\s*[a-z\d_-]+/gi, "")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\(\s*[,;]\s*/g, "(");

    if (!articleId) return;

    const article = articles.find((item) => item.id_artigo.toString() === articleId);
    let replacement = escapeHtmlAttr(visibleReference);

    if (article?.artigo && isSafeHttpUrl(article.artigo) && visibleReference) {
      replacement = `<a href="${escapeHtmlAttr(article.artigo)}" target="_blank" rel="noopener noreferrer">${escapeHtmlAttr(visibleReference)}</a>`;
    }

    processedText = processedText.replace(fullMatch, replacement);
  });

  return sanitizeHtml(processedText);
}
