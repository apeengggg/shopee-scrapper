import { getCurrentUser } from "@/lib/auth";
import { getOpenAiApiKey } from "@/lib/credentials";
import { apiError, json } from "@/lib/http";
import { importLeads, generateLandingDraft, previewUrl, publishLandingDraft } from "@/lib/landing-api";
import { listLeadMapsLeads, runLeadSearch } from "@/lib/lead-maps-api";
import { prisma } from "@/lib/prisma";
import { leadToLandingPipelineInput } from "@/lib/validators";

type PipelineSummary = {
  searched: number;
  ready: number;
  candidate: number;
  ignored: number;
  selected: number;
  imported: number;
  created: number;
  updated: number;
  generated: number;
  fallback: number;
  published: number;
  failed: number;
};

type PipelineRunRecord = {
  id: string;
  status: string;
  summary?: unknown;
  errors?: string[];
  draftIds?: string[];
  previewUrls?: string[];
};

type PipelinePrisma = typeof prisma & {
  pipelineRun: {
    findMany(args: unknown): Promise<PipelineRunRecord[]>;
    create(args: unknown): Promise<PipelineRunRecord>;
    update(args: unknown): Promise<PipelineRunRecord>;
  };
};

const db = prisma as unknown as PipelinePrisma;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const runs = await db.pipelineRun.findMany({
      where: { kind: "lead-to-landing" },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return json({ runs });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const input = leadToLandingPipelineInput.parse(await request.json());
    const run = await db.pipelineRun.create({
      data: {
        kind: "lead-to-landing",
        status: "running",
        location: input.location,
        category: input.category,
        radiusMeters: input.radiusMeters,
        leadStatusFilter: input.leadStatusFilter,
        maxLeads: input.maxLeads,
        publishMode: input.publishMode,
        config: input,
        createdById: user.id,
        startedAt: new Date()
      }
    });

    try {
      const result = await executePipeline(input);
      const completed = await db.pipelineRun.update({
        where: { id: run.id },
        data: {
          status: result.summary.failed > 0 ? "completed_with_errors" : "completed",
          summary: result.summary,
          errors: result.errors,
          draftIds: result.draftIds,
          previewUrls: result.previewUrls,
          finishedAt: new Date()
        }
      });

      return json({ run: completed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pipeline failed";
      const failed = await db.pipelineRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          errors: [message],
          summary: emptySummary(),
          finishedAt: new Date()
        }
      });
      return json({ run: failed, error: message }, { status: 500 });
    }
  } catch (error) {
    return apiError(error);
  }
}

async function executePipeline(input: ReturnType<typeof leadToLandingPipelineInput.parse>) {
  const search = await runLeadSearch(input);
  const leadData = await listLeadMapsLeads({
    searchRunId: search.run.id,
    status: input.leadStatusFilter,
    category: input.category,
    limit: input.maxLeads
  });
  const selectedLeads = leadData.leads.slice(0, input.maxLeads);
  if (!selectedLeads.length) {
    return {
      summary: {
        searched: search.summary.total,
        ready: search.summary.ready,
        candidate: search.summary.candidate,
        ignored: search.summary.ignored,
        selected: 0,
        imported: 0,
        created: 0,
        updated: 0,
        generated: 0,
        fallback: 0,
        published: 0,
        failed: 0
      },
      errors: [],
      draftIds: [],
      previewUrls: []
    };
  }
  const imported = await importLeads({
    sourceLeadIds: selectedLeads.map((lead) => lead.id),
    status: input.leadStatusFilter,
    maxLeads: input.maxLeads
  });
  const apiKey = await getOpenAiApiKey();

  const errors: string[] = [];
  const draftIds: string[] = [];
  const previewUrls: string[] = [];
  let generated = 0;
  let fallback = 0;
  let published = 0;
  let failed = 0;

  for (const lead of imported.leads.slice(0, input.maxLeads)) {
    try {
      const generatedDraft = await generateLandingDraft({ importedLeadId: lead.id, apiKey });
      const draft = generatedDraft.draft;
      draftIds.push(draft.id);
      generated += 1;
      if (draft.generationStatus === "fallback") fallback += 1;

      if (input.publishMode === "auto_publish") {
        const publishedDraft = await publishLandingDraft(draft.id);
        published += 1;
        const url = previewUrl(publishedDraft.draft.previewPath);
        if (url) previewUrls.push(url);
      }
    } catch (error) {
      failed += 1;
      errors.push(`${lead.name}: ${error instanceof Error ? error.message : "generation failed"}`);
    }
  }

  const summary: PipelineSummary = {
    searched: search.summary.total,
    ready: search.summary.ready,
    candidate: search.summary.candidate,
    ignored: search.summary.ignored,
    selected: selectedLeads.length,
    imported: imported.imported,
    created: imported.created,
    updated: imported.updated,
    generated,
    fallback,
    published,
    failed
  };

  return { summary, errors, draftIds, previewUrls };
}

function emptySummary(): PipelineSummary {
  return {
    searched: 0,
    ready: 0,
    candidate: 0,
    ignored: 0,
    selected: 0,
    imported: 0,
    created: 0,
    updated: 0,
    generated: 0,
    fallback: 0,
    published: 0,
    failed: 0
  };
}
