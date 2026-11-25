// services/api/gbif.service.ts
import axios from 'axios';
import { get } from '@/services/api/apiClient';
import {
  speciesList,
  SpeciesGBIFResult,
  SpeciesImagesApiResponse,
} from '@/services/types/gbif.types';

export { speciesList };

// Função que recebe nome científico e faz requisição para buscar a usage key da espécie no GBIF
export async function getGbifUsageKey(scientificName: string): Promise<number | null> {
  try {
    const response = await axios.get('https://api.gbif.org/v1/species/match', {
      params: { name: scientificName },
    });

    const usageKey = response.data?.usageKey;
    return usageKey ?? null;
  } catch (error) {
    console.error('Erro ao buscar usageKey no GBIF:', error);
    return null;
  }
}

// Função que usa como parâmetro a usage key e busca as imagens da espécie referente
export async function getGbifImages(usageKey: number): Promise<string[]> {
  return (await getSpeciesImages(usageKey)).images.map(image => image.url);
}

export async function getSpeciesImages(usageKey: number): Promise<SpeciesImagesApiResponse> {
  if (!Number.isInteger(usageKey) || usageKey <= 0) {
    throw new RangeError('usageKey deve ser um inteiro positivo');
  }

  const response = await get<SpeciesImagesApiResponse>(
    `/especies/${usageKey}/imagens`,
  );

  return { ...response, images: response.images.filter(image => typeof image.url === 'string' && image.url.trim().length > 0) };
}

// Função que pega mapa de referência de espécies
export function getGbifOccurrenceMapUrl(taxonKey: number): string {
  return `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}.mvt?srs=EPSG:3857&taxonKey=${taxonKey}`;
}

// Função que recebe uma lista de espécies específicas e retorna suas imagens
export async function getImageListOfSpecies(): Promise<SpeciesGBIFResult[]> {
  return Promise.all(
    speciesList.map(async (res) => {
      const usageKey = await getGbifUsageKey(res.nome_cientifico);
      let images: SpeciesImagesApiResponse['images'] = [];

      if (usageKey) {
        try {
          images = (await getSpeciesImages(usageKey)).images;
        } catch (error) {
          console.error(
            `Erro ao carregar imagens de ${res.nome_cientifico}:`,
            error,
          );
        }
      }

      return {
        ...res,
        gbifUsageKey: usageKey,
        gbifImage: (images[res.imageIndex] ?? images[0])?.url ?? null,
        gbifImageDetails: images[res.imageIndex] ?? images[0],
      };
    }),
  );
}
