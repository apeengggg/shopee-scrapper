import type { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, json } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const q = url.searchParams.get("q");
    const searchRunId = url.searchParams.get("searchRunId");
    const ids = url.searchParams.get("ids")?.split(",").map((id) => id.trim()).filter(Boolean);
    const limit = Number(url.searchParams.get("limit") ?? 200);

    const where: Prisma.LeadWhereInput = {
      id: ids?.length ? { in: ids } : undefined,
      status: isLeadStatus(status) ? status : undefined,
      category: category || undefined,
      searchRunLeads: searchRunId ? { some: { searchRunId } } : undefined,
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
      take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 200
    });

    return json({ leads });
  } catch (error) {
    return apiError(error);
  }
}

function isLeadStatus(value: string | null): value is LeadStatus {
  return value === "ready" || value === "candidate" || value === "ignored";
}
