export interface Coordinate {
  lat: number;
  lng: number;
}

export interface MapPoint extends Coordinate {
  id: string;
  source: "manual" | "csv";
  label?: string;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`,
      { headers: { "User-Agent": "SIAPESQ/1.0" } },
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
    if (city && state) return `${city} - ${state}`;
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

export function pointKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function isDuplicatePoint(
  points: MapPoint[],
  lat: number,
  lng: number,
): boolean {
  const key = pointKey(lat, lng);
  return points.some((p) => pointKey(p.lat, p.lng) === key);
}
