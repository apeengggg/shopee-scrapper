import type { LeadStatus } from "@prisma/client";

export type OsmTags = Record<string, string | undefined>;

export function normalizeWebsite(tags: OsmTags) {
  return firstPresent(tags.website, tags["contact:website"], tags.url);
}

export function normalizePhone(tags: OsmTags) {
  return firstPresent(
    tags.phone,
    tags["contact:phone"],
    tags.mobile,
    tags["contact:mobile"]
  );
}

export function normalizeAddress(tags: OsmTags) {
  const direct = firstPresent(tags["addr:full"], tags.address);
  if (direct) return direct;

  const parts = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:postcode"]
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : undefined;
}

export function classifyLead(website?: string | null, phone?: string | null): LeadStatus {
  if (website && website.trim().length > 0) return "ignored";
  if (phone && phone.trim().length > 0) return "ready";
  return "candidate";
}

export function businessType(tags: OsmTags) {
  return (
    firstPresent(tags.shop, tags.amenity, tags.tourism, tags.office, tags.craft) ??
    "business"
  );
}

export function firstPresent(...values: Array<string | undefined | null>) {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}
