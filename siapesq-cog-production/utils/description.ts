import { listarArtigos } from "@/services/api/artigos.service";

export async function addArticlesInDescription(descricao: string): Promise<string> {
  if (!descricao) return descricao;

  try {
    const todosArtigos = await listarArtigos();

    let descricaoFinal = descricao;
    const regex = /\(([^)]+)\)/g;
    
    descricaoFinal = descricao.replace(regex, (fullMatch, conteudo) => {
      const idsNoConteudo = conteudo.match(/(\d+)/g); 
      const idExtraido = idsNoConteudo ? idsNoConteudo[idsNoConteudo.length - 1] : null;

      if (idExtraido) {
        const artigoEncontrado = todosArtigos.find((art) =>
          art.id_artigo.toString() === idExtraido
        );

        const artigoUrl = artigoEncontrado?.artigo;

        if (artigoUrl) {
          return `<a href="${artigoUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-semibold">${fullMatch}</a>`;
        }
      }
      
      return fullMatch;
    });

    return descricaoFinal;

  } catch (e) {
    console.error("Erro ao processar referências pelo ID:", e);
    return descricao;
  }
}
