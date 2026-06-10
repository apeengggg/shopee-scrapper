import { apiError, json } from "@/lib/http";
import { generateLandingDraft } from "@/lib/landing-generator";
import { prisma } from "@/lib/prisma";
import { createDraftInput } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = createDraftInput.parse(await request.json());
    const lead = await prisma.importedLead.findUniqueOrThrow({
      where: { id: input.importedLeadId }
    });
    const generated = generateLandingDraft(lead);

    const draft = await prisma.landingDraft.create({
      data: {
        importedLeadId: lead.id,
        ...generated
      }
    });

    return json({ draft });
  } catch (error) {
    return apiError(error);
  }
}
