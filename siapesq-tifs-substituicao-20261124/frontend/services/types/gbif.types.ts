// services/types/gbif.types.ts

export interface SpeciesGBIFItem {
  nome_cientifico: string;
  imageIndex: number;
}

export interface SpeciesGBIFResult extends SpeciesGBIFItem {
  gbifImageDetails?: SpeciesImageApiItem;
  gbifUsageKey: number | null;
  gbifImage: string | null;
}

export interface SpeciesImageApiItem {
  url: string;
  creator?: string | null;
  rightsHolder?: string | null;
  license?: string | null;
  licenseUrl?: string | null;
  sourceUrl?: string | null;
  occurrenceKey?: number | string | null;
  occurrenceUrl?: string | null;
}

export interface SpeciesImagesApiResponse {
  usageKey: number;
  images: SpeciesImageApiItem[];
}

export const speciesList: SpeciesGBIFItem[] = [
  { nome_cientifico: "Puma concolor", imageIndex: 12 },
  { nome_cientifico: "Vanellus chilensis", imageIndex: 9 },
  { nome_cientifico: "Ramphastos dicolorus", imageIndex: 2 },
  { nome_cientifico: "Passer domesticus", imageIndex: 0 },
  { nome_cientifico: "Columbina talpacoti", imageIndex: 4 },
  { nome_cientifico: "Nasua nasua", imageIndex: 3 },
  { nome_cientifico: "Eugenia uniflora", imageIndex: 1 },
  { nome_cientifico: "Hydrochoerus hydrochaeris", imageIndex: 1 },
  { nome_cientifico: "Turdus rufiventris", imageIndex: 3 },
  { nome_cientifico: "Rupornis magnirostris", imageIndex: 0 },
];
