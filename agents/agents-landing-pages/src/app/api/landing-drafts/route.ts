import { apiError, json } from "@/lib/http";
import { generateLandingDraft } from "@/lib/landing-generator";
import { prisma } from "@/lib/prisma";
import { createDraftInput, draftListInput } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = draftListInput.parse({
      status: url.searchParams.get("status") ?? "all",
      published: url.searchParams.get("published") ?? "all",
      q: url.searchParams.get("q") ?? undefined
    });

    const drafts = await prisma.landingDraft.findMany({
      where: {
        status: input.status === "all" ? undefined : input.status,
        published: input.published === "all" ? undefined : input.published === "true",
        OR: input.q
          ? [
              { importedLead: { name: { contains: input.q, mode: "insensitive" } } },
              { importedLead: { category: { contains: input.q, mode: "insensitive" } } },
              { heroHeadlineId: { contains: input.q, mode: "insensitive" } },
              { descriptionId: { contains: input.q, mode: "insensitive" } }
            ]
          : undefined
      },
      include: { importedLead: true },
      orderBy: { updatedAt: "desc" },
      take: 200
    });

    return json({ drafts });
  } catch (error) {
    return apiError(error);
  }
}

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
