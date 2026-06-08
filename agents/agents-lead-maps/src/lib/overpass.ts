import { appConfig } from "@/lib/env";
import { categoryToOverpassFilters } from "@/lib/osm-tags";

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

export async function searchBusinesses(params: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  category: string;
}) {
  const filters = categoryToOverpassFilters(params.category);
  const selectors = filters
    .flatMap((filter) => [
      `node(around:${params.radiusMeters},${params.latitude},${params.longitude})${filter};`,
      `way(around:${params.radiusMeters},${params.latitude},${params.longitude})${filter};`,
      `relation(around:${params.radiusMeters},${params.latitude},${params.longitude})${filter};`
    ])
    .join("\n");

  const query = `
    [out:json][timeout:25];
    (
      ${selectors}
    );
    out center tags 100;
  `;

  const body = new URLSearchParams({ data: query });
  const response = await fetch(appConfig.overpassEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": appConfig.userAgent
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Overpass request failed: ${response.status}`);
  }

  const data = (await response.json()) as OverpassResponse;
  return data.elements.filter((element) => element.tags?.name);
}
