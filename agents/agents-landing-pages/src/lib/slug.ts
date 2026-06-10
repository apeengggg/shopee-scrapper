import { prisma } from "@/lib/prisma";

export async function uniqueLandingSlug(name: string, draftId: string) {
  const base = slugify(name) || `landing-${draftId.slice(0, 8)}`;
  let slug = base;
  let suffix = 2;

  while (await slugExists(slug, draftId)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function slugExists(slug: string, draftId: string) {
  const existing = await prisma.landingDraft.findUnique({
    where: { slug },
    select: { id: true }
  });
  return Boolean(existing && existing.id !== draftId);
}
