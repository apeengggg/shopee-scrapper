import type { LeadStatus, Prisma } from "@prisma/client";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q");

    const where: Prisma.ImportedLeadWhereInput = {
      sourceStatus: isLeadStatus(status) ? status : undefined,
      OR: q
        ? [
            { name: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } }
          ]
        : undefined
    };

    const leads = await prisma.importedLead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        drafts: {
          orderBy: { updatedAt: "desc" },
          take: 1
        }
      }
    });

    return json({ leads });
  } catch (error) {
    return apiError(error);
  }
}

function isLeadStatus(value: string | null): value is LeadStatus {
  return value === "ready" || value === "candidate" || value === "ignored";
}
