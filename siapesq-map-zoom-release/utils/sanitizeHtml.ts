import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["a", "b", "strong", "i", "em", "u", "br", "p", "span"];
// "class" e "style" ficam de fora de propósito: texto vindo da API poderia trazer
// HTML cru com esses atributos (ex: <span class="fixed inset-0 z-[999] bg-red-500">
// ou style="position:fixed;..."), o que sobreviveria à sanitização e permitiria um
// overlay de tela cheia (UI redress / phishing) sem precisar de <script> nenhum.
const ALLOWED_ATTR = ["href", "target", "rel"];

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";

  // O padrão do DOMPurify já rejeita esquemas perigosos em href (javascript:, data:, etc.);
  // os links que a aplicação gera são validados à parte com isSafeHttpUrl.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Escapa um valor antes de concatená-lo dentro de um atributo HTML entre aspas duplas
// (ex: href="${escapeHtmlAttr(url)}"). Sem isso, um valor como `x" style="..."` quebra
// pra fora do atributo e injeta um atributo novo na tag, que sobreviveria à sanitização
// mesmo com a URL validada por isSafeHttpUrl.
export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
