import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { uniqueLandingSlug } from "@/lib/slug";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const draft = await prisma.landingDraft.findUniqueOrThrow({
      where: { id },
      include: { importedLead: true }
    });
    const slug = draft.slug ?? (await uniqueLandingSlug(draft.importedLead.name, draft.id));
    const previewPath = `/p/${slug}`;

    const published = await prisma.landingDraft.update({
      where: { id },
      data: {
        published: true,
        publishedAt: draft.publishedAt ?? new Date(),
        slug,
        previewPath
      },
      include: { importedLead: true }
    });

    return json({ draft: published });
  } catch (error) {
    return apiError(error);
  }
}
