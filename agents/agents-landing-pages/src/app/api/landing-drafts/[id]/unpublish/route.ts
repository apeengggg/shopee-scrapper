import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const draft = await prisma.landingDraft.update({
      where: { id },
      data: {
        published: false,
        publishedAt: null
      },
      include: { importedLead: true }
    });

    return json({ draft });
  } catch (error) {
    return apiError(error);
  }
}
