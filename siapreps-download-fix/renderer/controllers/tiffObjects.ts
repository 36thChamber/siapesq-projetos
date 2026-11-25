// Resolve only keys advertised by the API. Never guess a date or substitute a species.
export type TiffSelection = { filename: string; key: string; date?: string };
export function resolveTiffObjects(names: string[], keys: string[]) {
  const unique = Array.from(new Set(names));
  const candidates = new Map<string, TiffSelection[]>();
  for (const name of unique) {
    const options: TiffSelection[] = [];
    for (const key of keys) {
      const parts = key.split('/');
      const date = parts[2];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) continue;
      if (parts.length === 5 && parts[0] === 'predictions' && parts[1] === 'daily' &&
          parts[3] === name && parts[4] === `${name}_rf_${date}_mean.tif` ||
          parts.length === 4 && parts[0] === 'predictors' && parts[1] === 'daily' &&
          parts[3] === `${name}_${date}.tif`) {
        options.push({ filename: `${name}.tif`, key, date });
      }
    }
    candidates.set(name, options);
  }
  const dated = unique.filter(name => candidates.get(name)!.length > 0);
  // Use the most recent date shared by all dated layers, not independently latest dates.
  const dates = dated.length ? candidates.get(dated[0])!.map(item => item.date!)
    .filter(date => dated.every(name => candidates.get(name)!.some(item => item.date === date)))
    .sort().reverse() : [];
  const selected: TiffSelection[] = [];
  const missing: string[] = [];
  for (const name of unique) {
    const options = candidates.get(name)!;
    const item = options.find(item => item.date === dates[0]);
    if (item) selected.push(item);
    else if (!options.length && keys.includes(`${name}.tif`))
      selected.push({ filename: `${name}.tif`, key: `${name}.tif` });
    else missing.push(`${name}.tif`);
  }
  return { selected, missing, date: dates[0] };
}

export async function listAllTiffKeys(fetchPage: (token?: string) => Promise<any>): Promise<string[]> {
  const keys: string[] = [];
  const seen = new Set<string>();
  let token: string | undefined;
  do {
    const page = await fetchPage(token);
    if (!page || !Array.isArray(page.objects)) throw new Error('Lista de mapas inválida.');
    for (const object of page.objects) {
      if (typeof object.Key === 'string' && object.Key.endsWith('.tif')) keys.push(object.Key);
    }
    token = page.next_aws_pagination_token || undefined;
    if (token && (typeof token !== 'string' || seen.has(token)))
      throw new Error('Paginação de mapas inválida.');
    if (token) seen.add(token);
  } while (token);
  return keys;
}

export function isTiff(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && (
    bytes[0] === 73 && bytes[1] === 73 && (bytes[2] === 42 || bytes[2] === 43) && bytes[3] === 0 ||
    bytes[0] === 77 && bytes[1] === 77 && bytes[2] === 0 && (bytes[3] === 42 || bytes[3] === 43));
}
