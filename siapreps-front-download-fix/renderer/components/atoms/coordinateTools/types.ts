export interface Coordinate {
  lat: number;
  lng: number;
}

export type PointSource = "manual" | "csv";

export interface ManualPoint extends Coordinate {
  id: string;
  label?: string;
  source: PointSource;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`,
      {
        headers: {
          "User-Agent": "SIAPESQ-STE/1.0",
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();

    const addr = data.address;

    if (!addr) return null;

    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county;

    const state = addr.state;

    if (!city && !state) return null;

    if (city && state) {
      return `${city} - ${state}`;
    }

    return city || state;
  } catch {
    return null;
  }
}

export function isValidLatitude(value: number): boolean {
  return !isNaN(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return !isNaN(value) && value >= -180 && value <= 180;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

export function isDuplicatePoint(
  points: ManualPoint[],
  lat: number,
  lng: number
): boolean {
  return points.some(
    (p) =>
      p.lat.toFixed(5) === lat.toFixed(5) &&
      p.lng.toFixed(5) === lng.toFixed(5)
  );
}