import { prisma } from "@/lib/prisma";
import { appConfig } from "@/lib/env";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
};

export async function geocodeLocation(location: string) {
  const query = location.trim().toLowerCase();
  const cached = await prisma.geoCache.findUnique({ where: { query } });
  if (cached) {
    return { latitude: cached.latitude, longitude: cached.longitude };
  }

  const url = new URL(appConfig.nominatimEndpoint);
  url.searchParams.set("q", location);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": appConfig.userAgent,
      Referer: "https://localhost"
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status}`);
  }

  const data = (await response.json()) as NominatimResult[];
  const first = data[0];
  if (!first) {
    throw new Error(`Location not found: ${location}`);
  }

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);

  await prisma.geoCache.upsert({
    where: { query },
    update: { latitude, longitude, raw: first },
    create: { query, latitude, longitude, raw: first }
  });

  return { latitude, longitude };
}
