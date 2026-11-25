import type { SpeciesImageApiItem } from "@/services/types/gbif.types";

function safeUrl(value?: string | null): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return; }
}

export default function ImageCredit({ image }: { image: SpeciesImageApiItem }) {
  const author = [...new Set([image.creator, image.rightsHolder].filter(Boolean))].join(" / ") || "Autoria não informada";
  const license = image.license?.includes("creativecommons.org")
    ? image.license.includes("/zero/") ? "CC0" : `CC ${image.license.match(/licenses\/([^/]+)\/([^/]+)/)?.slice(1).join(" ").toUpperCase() || ""}`
    : image.license || "Licença não informada";
  const licenseUrl = safeUrl(image.licenseUrl) || safeUrl(image.license);
  const source = safeUrl(image.occurrenceUrl) || safeUrl(image.sourceUrl);
  return <small className="block text-xs leading-relaxed text-slate-600" data-testid="image-credit">
    {author}{" · "}
    {licenseUrl ? <a href={licenseUrl} target="_blank" rel="noreferrer" className="underline">{license}</a> : license}
    {source && <> · <a href={source} target="_blank" rel="noreferrer" className="underline">Fonte da imagem</a></>}
  </small>;
}
