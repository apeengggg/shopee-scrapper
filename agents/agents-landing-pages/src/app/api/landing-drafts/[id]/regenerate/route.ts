import { apiError, json } from "@/lib/http";
import { generateDraftContent } from "@/lib/openai-generator";
import { prisma } from "@/lib/prisma";
import { regenerateDraftInput } from "@/lib/validators";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const input = regenerateDraftInput.parse(await request.json().catch(() => ({})));
    const existing = await prisma.landingDraft.findUniqueOrThrow({
      where: { id },
      include: { importedLead: true }
    });
    const generated = await generateDraftContent({
      lead: existing.importedLead,
      mode: input.mode,
      apiKey: request.headers.get("x-openai-api-key")
    });

    const draft = await prisma.landingDraft.update({
      where: { id },
      data: generated,
      include: { importedLead: true }
    });

    return json({ draft });
  } catch (error) {
    return apiError(error);
  }
}
