export type CatalogImage = {
  key: string;
  sourceUrl?: string | null;
  occurrenceKey?: number | string | null;
  downloadedFrom?: string | null;
  occurrenceUrl?: string | null;
  datasetKey?: string | null;
  creator?: string | null;
  rightsHolder?: string | null;
  license?: string | null;
  licenseUrl?: string | null;
  references?: string | null;
  title?: string | null;
  sha256?: string | null;
  bytes?: number | null;
  contentType?: string | null;
  width?: number | null;
  height?: number | null;
  [metadata: string]: unknown;
};

export type CatalogEntry = {
  scientificName: string;
  slug: string;
  usageKey?: number;
  images: CatalogImage[];
  [metadata: string]: unknown;
};

export type SpeciesImagesCatalog = {
  species: CatalogEntry[];
  byUsageKey: Record<string, string>;
  [metadata: string]: unknown;
};

export type SpeciesImage = Omit<CatalogImage, "key"> & { url: string };

export type SpeciesImagesResponse = {
  usageKey: number;
  images: SpeciesImage[];
};
