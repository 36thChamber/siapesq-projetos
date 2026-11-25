// Minimal adapter retaining the existing provider's Promise<string[]> contract.
// For photo credits, consume the full images objects returned by the same endpoint.
import axios from 'axios';

export type SpeciesImage = {
  url: string;
  creator?: string;
  rightsHolder?: string;
  license: string;
  licenseUrl?: string;
  occurrenceUrl: string;
  sourceUrl: string;
};

export async function getSpeciesImages(usageKey: number): Promise<{
  scientificName: string; expiresAt: number; images: SpeciesImage[];
}> {
  const response = await axios.get(`/api/species-images/${usageKey}`);
  return response.data;
}

export async function getGbifImages(usageKey: number): Promise<string[]> {
  return (await getSpeciesImages(usageKey)).images.map(image => image.url);
}
