export type CsvPoint = { lat: number; lng: number };

export type CsvParseResult = {
  points: CsvPoint[];
  invalidCount: number;
  error?: string;
};

export function parseCSVPoints(content: string): CsvParseResult {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) {
    return { points: [], invalidCount: 0, error: "Arquivo CSV vazio." };
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const latIdx = headers.indexOf("latitude");
  const lngIdx = headers.indexOf("longitude");

  if (latIdx === -1 || lngIdx === -1) {
    return {
      points: [],
      invalidCount: 0,
      error: 'O CSV deve conter as colunas "latitude" e "longitude".',
    };
  }

  let invalidCount = 0;
  const points: CsvPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length <= Math.max(latIdx, lngIdx)) {
      invalidCount++;
      continue;
    }
    const lat = parseFloat(cols[latIdx].trim());
    const lng = parseFloat(cols[lngIdx].trim());
    if (isNaN(lat) || isNaN(lng)) {
      invalidCount++;
      continue;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      invalidCount++;
      continue;
    }
    points.push({ lat, lng });
  }

  return { points, invalidCount };
}
