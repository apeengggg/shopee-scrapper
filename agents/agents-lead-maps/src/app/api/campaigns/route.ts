import { prisma } from "@/lib/prisma";
import { campaignInput } from "@/lib/validators";
import { apiError, json } from "@/lib/http";

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { searchRuns: { orderBy: { createdAt: "desc" }, take: 3 } }
    });

    return json({ campaigns });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = campaignInput.parse(await request.json());
    const campaign = await prisma.campaign.create({
      data: {
        ...input,
        nextRunAt: new Date()
      }
    });

    return json({ campaign });
  } catch (error) {
    return apiError(error);
  }
}
