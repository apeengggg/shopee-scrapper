import type { ImportedLead } from "@prisma/client";

export type TemplatePhoto = {
  key: string;
  path: string;
  alt: string;
};

export const templatePhotos: Record<string, TemplatePhoto> = {
  dental: {
    key: "dental",
    path: "/template-photos/dental.svg",
    alt: "Clean dental clinic treatment room"
  },
  restaurant: {
    key: "restaurant",
    path: "/template-photos/restaurant.svg",
    alt: "Restaurant dining table setup"
  },
  cafe: {
    key: "cafe",
    path: "/template-photos/cafe.svg",
    alt: "Cafe counter with warm lighting"
  },
  pharmacy: {
    key: "pharmacy",
    path: "/template-photos/pharmacy.svg",
    alt: "Pharmacy shelves and service counter"
  },
  repair: {
    key: "repair",
    path: "/template-photos/repair.svg",
    alt: "Local repair shop workspace"
  },
  generic: {
    key: "generic",
    path: "/template-photos/generic.svg",
    alt: "Local business storefront"
  }
};

export function selectTemplatePhotoKey(lead: Pick<ImportedLead, "category" | "businessType">) {
  const text = `${lead.category} ${lead.businessType ?? ""}`.toLowerCase();
  if (text.includes("gigi") || text.includes("dental")) return "dental";
  if (text.includes("restoran") || text.includes("restaurant")) return "restaurant";
  if (text.includes("cafe") || text.includes("coffee")) return "cafe";
  if (text.includes("apotek") || text.includes("pharmacy")) return "pharmacy";
  if (text.includes("bengkel") || text.includes("repair")) return "repair";
  return "generic";
}

export function getTemplatePhoto(key?: string | null) {
  return templatePhotos[key ?? "generic"] ?? templatePhotos.generic;
}
