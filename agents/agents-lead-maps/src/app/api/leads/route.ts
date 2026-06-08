import type { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, json } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const q = url.searchParams.get("q");

    const where: Prisma.LeadWhereInput = {
      status: isLeadStatus(status) ? status : undefined,
      category: category || undefined,
      OR: q
        ? [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } }
          ]
        : undefined
    };

    const leads = await prisma.lead.findMany({
      where,
      orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }],
      take: 200
    });

    return json({ leads });
  } catch (error) {
    return apiError(error);
  }
}

function isLeadStatus(value: string | null): value is LeadStatus {
  return value === "ready" || value === "candidate" || value === "ignored";
}
