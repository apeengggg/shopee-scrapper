import type { Prisma } from "@prisma/client";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { fetchSourceLeads } from "@/lib/lead-source";
import { importLeadsInput } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = importLeadsInput.parse(body);
    const sourceLeads = await fetchSourceLeads({
      status: input.status,
      sourceLeadIds: input.sourceLeadIds,
      maxLeads: input.maxLeads
    });

    let created = 0;
    let updated = 0;
    const leads = [];

    for (const sourceLead of sourceLeads) {
      const data: Prisma.ImportedLeadCreateInput = {
        sourceLeadId: sourceLead.id,
        name: sourceLead.name,
        category: sourceLead.category,
        businessType: sourceLead.businessType,
        phone: sourceLead.phone,
        website: sourceLead.website,
        address: sourceLead.address,
        latitude: sourceLead.latitude,
        longitude: sourceLead.longitude,
        sourceStatus: sourceLead.status
      };

      const existing = await prisma.importedLead.findUnique({
        where: { sourceLeadId: sourceLead.id },
        select: { id: true }
      });

      const importedLead = await prisma.importedLead.upsert({
        where: { sourceLeadId: sourceLead.id },
        create: data,
        update: data
      });
      leads.push(importedLead);

      if (existing) updated += 1;
      else created += 1;
    }

    return json({ imported: sourceLeads.length, created, updated, leads });
  } catch (error) {
    return apiError(error);
  }
}
