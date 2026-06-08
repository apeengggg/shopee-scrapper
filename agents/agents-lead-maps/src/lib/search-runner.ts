import { prisma } from "@/lib/prisma";
import { geocodeLocation } from "@/lib/nominatim";
import { searchBusinesses } from "@/lib/overpass";
import {
  businessType,
  classifyLead,
  normalizeAddress,
  normalizePhone,
  normalizeWebsite,
  type OsmTags
} from "@/lib/lead-utils";

export async function createAndRunSearch(params: {
  location: string;
  category: string;
  radiusMeters: number;
  campaignId?: string;
}) {
  const run = await prisma.searchRun.create({
    data: {
      location: params.location,
      category: params.category,
      radiusMeters: params.radiusMeters,
      campaignId: params.campaignId
    }
  });

  return runSearch(run.id);
}

export async function runSearch(searchRunId: string) {
  const run = await prisma.searchRun.update({
    where: { id: searchRunId },
    data: { status: "running", startedAt: new Date(), error: null }
  });

  try {
    const location = await geocodeLocation(run.location);
    const elements = await searchBusinesses({
      ...location,
      category: run.category,
      radiusMeters: run.radiusMeters
    });

    let ready = 0;
    let candidate = 0;
    let ignored = 0;

    for (const element of elements) {
      const tags: OsmTags = element.tags ?? {};
      const phone = normalizePhone(tags);
      const website = normalizeWebsite(tags);
      const status = classifyLead(website, phone);
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;

      if (status === "ready") ready += 1;
      if (status === "candidate") candidate += 1;
      if (status === "ignored") ignored += 1;

      const lead = await prisma.lead.upsert({
        where: {
          osmType_osmId: {
            osmType: element.type,
            osmId: BigInt(element.id)
          }
        },
        update: {
          name: tags.name ?? "Unnamed business",
          category: run.category,
          osmTags: tags,
          businessType: businessType(tags),
          phone,
          website,
          address: normalizeAddress(tags),
          latitude,
          longitude,
          status
        },
        create: {
          osmType: element.type,
          osmId: BigInt(element.id),
          name: tags.name ?? "Unnamed business",
          category: run.category,
          osmTags: tags,
          businessType: businessType(tags),
          phone,
          website,
          address: normalizeAddress(tags),
          latitude,
          longitude,
          status
        }
      });

      await prisma.searchRunLead.upsert({
        where: {
          searchRunId_leadId: {
            searchRunId: run.id,
            leadId: lead.id
          }
        },
        update: {},
        create: {
          searchRunId: run.id,
          leadId: lead.id
        }
      });
    }

    const completed = await prisma.searchRun.update({
      where: { id: run.id },
      data: { status: "completed", finishedAt: new Date() },
      include: { leads: true }
    });

    return {
      run: completed,
      summary: {
        total: elements.length,
        ready,
        candidate,
        ignored
      }
    };
  } catch (error) {
    await prisma.searchRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        finishedAt: new Date()
      }
    });
    throw error;
  }
}

export async function runDueCampaigns() {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: { active: true, nextRunAt: { lte: now } },
    orderBy: { nextRunAt: "asc" },
    take: 5
  });

  const results = [];
  for (const campaign of campaigns) {
    const result = await createAndRunSearch({
      location: campaign.location,
      category: campaign.category,
      radiusMeters: campaign.radiusMeters,
      campaignId: campaign.id
    });

    const nextRunAt = new Date(Date.now() + campaign.scheduleMinutes * 60 * 1000);
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { lastRunAt: now, nextRunAt }
    });

    results.push({ campaignId: campaign.id, ...result.summary });
  }

  return results;
}
