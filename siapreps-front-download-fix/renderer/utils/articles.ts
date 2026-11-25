import { Artigo, ArtigosPorEspecie } from "../controllers/types/artigos-types";

const ESPECIES_DISPONIVEIS = [
  ["bugio ruivo", "alouatta guariba"],
  ["bugio preto", "alouatta caraya"],
  ["macaco prego preto", "sapajus nigritus"],
];

function normalizarNomeEspecie(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function filtrarArtigosDeEspeciesDisponiveis(
  artigos: Artigo[]
): Artigo[] {
  return artigos.filter((artigo) => {
    if (!artigo.nome_especie) return false;

    const nomeEspecie = normalizarNomeEspecie(artigo.nome_especie);

    return ESPECIES_DISPONIVEIS.some((nomes) =>
      nomes.some((nome) => nomeEspecie.includes(nome))
    );
  });
}

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
