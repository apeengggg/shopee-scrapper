import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { draftPatchInput } from "@/lib/validators";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const input = draftPatchInput.parse(await request.json());
    const draft = await prisma.landingDraft.update({
      where: { id },
      data: input
    });

    return json({ draft });
  } catch (error) {
    return apiError(error);
  }
}
