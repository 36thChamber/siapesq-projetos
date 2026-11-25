import axios from "axios";

export async function getGbifUsageKey(scientificName: string): Promise<number | null> {
  try {
    const response = await axios.get("https://api.gbif.org/v1/species/match", {
      params: { name: scientificName },
    });

    const usageKey = response.data?.usageKey;
    //console.log("GBIF usageKey encontrado:", usageKey);

    return usageKey ?? null;
  } catch (error) {
    console.error("Erro ao buscar usageKey no GBIF:", error);
    return null;
  }
};
// Função que usa como parametro a usage key e busca as imagens da especie referente
// ✅ getGbifImages atualizada com offset/limit
export async function getGbifImages(
  usageKey: number, 
  offset: number = 6,  // Pula primeiras 6
  limit: number = 15   // Pega até 15
): Promise<string[]> {
  try {
    const response = await axios.get("https://api.gbif.org/v1/occurrence/search", {
      params: {
        taxonKey: usageKey,
        mediaType: "StillImage",
        limit: limit + offset, // Busca mais pra compensar slice
        offset: 0, // GBIF offset é por página, fazemos slice client-side
      },
    });

    const images: string[] = response.data.results
      .flatMap((occ: any) => occ.media || [])
      .map((m: any) => m.identifier)
      .filter((url: string) => url);

    // ✅ Slice client-side: pula offset, pega limit
    const filteredImages = images.slice(offset, offset + limit);
    
    console.log(`GBIF taxonKey ${usageKey}: ${images.length} total -> ${filteredImages.length} filtradas (offset ${offset}, limit ${limit})`);
    return filteredImages;
  } catch (error) {
    console.error("Erro ao buscar imagens no GBIF:", error);
    return [];
  }
}
