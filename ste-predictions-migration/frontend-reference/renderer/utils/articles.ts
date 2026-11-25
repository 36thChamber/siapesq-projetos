import { Artigo, ArtigosPorEspecie } from "../controllers/types/artigos-types";

export function agruparArtigosPorEspecie(
  artigos: Artigo[]
): ArtigosPorEspecie[] {
  const grupos: Record<string, ArtigosPorEspecie> = {};

  artigos.forEach((artigo) => {
    if (!artigo.id_especie) return;

    if (!grupos[artigo.id_especie]) {
      grupos[artigo.id_especie] = {
        id_especie: artigo.id_especie,
        nome_especie: artigo.nome_especie ?? "Espécie desconhecida",
        artigos: [],
      };
    }

    grupos[artigo.id_especie].artigos.push(artigo);
  });

  return Object.values(grupos);
}

export function visualizarArtigo(link: string | null) {
  if (!link) return;
  window.open(link, "_blank");
}

export function downloadAllArtigos(artigos: Artigo[]) {
  artigos.forEach((artigo) => {
    if (artigo.link_drive) {
      window.open(artigo.link_drive, "_blank");
    }
  });
}
