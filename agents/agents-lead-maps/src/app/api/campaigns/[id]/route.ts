import { prisma } from "@/lib/prisma";
import { campaignInput } from "@/lib/validators";
import { apiError, json } from "@/lib/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const input = campaignInput.partial().parse(payload);
    const campaign = await prisma.campaign.update({
      where: { id },
      data: input
    });

    return json({ campaign });
  } catch (error) {
    return apiError(error);
  }
}
