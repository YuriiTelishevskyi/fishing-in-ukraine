export interface GeoResult {
  label: string;
  lat: number;
  lng: number;
}

/** Free keyless geocoding via OpenStreetMap Nominatim. Ukraine-biased. Browser-only. */
export async function geocodePlaces(query: string, lang: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}` +
    `&countrycodes=ua&accept-language=${encodeURIComponent(lang)}&limit=5`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return data
    .map((d) => ({ label: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}
