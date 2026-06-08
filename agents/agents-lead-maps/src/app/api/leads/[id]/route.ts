import { prisma } from "@/lib/prisma";
import { leadPatchInput } from "@/lib/validators";
import { apiError, json } from "@/lib/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const input = leadPatchInput.parse(await request.json());
    const lead = await prisma.lead.update({
      where: { id },
      data: input
    });

    return json({ lead });
  } catch (error) {
    return apiError(error);
  }
}
