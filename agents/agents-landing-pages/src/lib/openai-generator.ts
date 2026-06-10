import OpenAI from "openai";
import { z } from "zod";
import type { ImportedLead } from "@prisma/client";
import { appConfig } from "@/lib/env";
import type { LandingDraftCopy } from "@/lib/landing-generator";
import { generateLandingDraft } from "@/lib/landing-generator";
import { selectTemplatePhotoKey, templatePhotos } from "@/lib/template-photos";

export const landingPromptVersion = "landing-v1";

const generatedDraftSchema = z.object({
  descriptionId: z.string().min(20),
  descriptionEn: z.string().min(20),
  heroHeadlineId: z.string().min(2),
  heroHeadlineEn: z.string().min(2),
  heroSubheadlineId: z.string().min(20),
  heroSubheadlineEn: z.string().min(20),
  servicesId: z.array(z.string().min(3)).min(3).max(6),
  servicesEn: z.array(z.string().min(3)).min(3).max(6),
  trustPointsId: z.array(z.string().min(3)).min(3).max(6),
  trustPointsEn: z.array(z.string().min(3)).min(3).max(6),
  ctaId: z.string().min(2),
  ctaEn: z.string().min(2),
  contactSectionId: z.string().min(10),
  contactSectionEn: z.string().min(10),
  templatePhotoKey: z.enum(["dental", "restaurant", "cafe", "pharmacy", "repair", "generic"])
});

export type GeneratedLandingDraft = LandingDraftCopy & {
  templatePhotoKey: string;
  generationProvider: string;
  generationModel?: string | null;
  generationPromptVersion: string;
  generationStatus: string;
  generationError?: string | null;
};

export async function generateDraftContent({
  lead,
  mode,
  apiKey
}: {
  lead: ImportedLead;
  mode: "template" | "openai";
  apiKey?: string | null;
}): Promise<GeneratedLandingDraft> {
  if (mode === "openai") {
    try {
      const key = apiKey || appConfig.openAiApiKey;
      if (!key) throw new Error("OpenAI API key is not configured");
      return await generateWithOpenAI(lead, key);
    } catch (error) {
      return templateDraft(lead, error instanceof Error ? error.message : "OpenAI generation failed");
    }
  }

  return templateDraft(lead);
}

async function generateWithOpenAI(lead: ImportedLead, apiKey: string): Promise<GeneratedLandingDraft> {
  const client = new OpenAI({ apiKey });
  const model = appConfig.openAiModel;
  const templateKeys = Object.keys(templatePhotos).join(", ");

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You generate factual bilingual landing-page draft JSON for local businesses. Use only provided lead facts. Never invent phone numbers, addresses, testimonials, prices, opening hours, ratings, licenses, awards, or real photos."
      },
      {
        role: "user",
        content: JSON.stringify({
          promptVersion: landingPromptVersion,
          instructions:
            "Return concise Indonesian and English landing-page copy. Use neutral wording for missing facts. Choose templatePhotoKey from the allowed keys.",
          allowedTemplatePhotoKeys: templateKeys,
          lead: {
            name: lead.name,
            category: lead.category,
            businessType: lead.businessType,
            phone: lead.phone,
            website: lead.website,
            address: lead.address,
            sourceStatus: lead.sourceStatus
          }
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "landing_page_draft",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            descriptionId: { type: "string" },
            descriptionEn: { type: "string" },
            heroHeadlineId: { type: "string" },
            heroHeadlineEn: { type: "string" },
            heroSubheadlineId: { type: "string" },
            heroSubheadlineEn: { type: "string" },
            servicesId: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            servicesEn: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            trustPointsId: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            trustPointsEn: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            ctaId: { type: "string" },
            ctaEn: { type: "string" },
            contactSectionId: { type: "string" },
            contactSectionEn: { type: "string" },
            templatePhotoKey: {
              type: "string",
              enum: ["dental", "restaurant", "cafe", "pharmacy", "repair", "generic"]
            }
          },
          required: [
            "descriptionId",
            "descriptionEn",
            "heroHeadlineId",
            "heroHeadlineEn",
            "heroSubheadlineId",
            "heroSubheadlineEn",
            "servicesId",
            "servicesEn",
            "trustPointsId",
            "trustPointsEn",
            "ctaId",
            "ctaEn",
            "contactSectionId",
            "contactSectionEn",
            "templatePhotoKey"
          ]
        }
      }
    }
  });

  const parsed = generatedDraftSchema.parse(JSON.parse(response.output_text));
  return {
    ...parsed,
    generationProvider: "openai",
    generationModel: model,
    generationPromptVersion: landingPromptVersion,
    generationStatus: "completed",
    generationError: null
  };
}

function templateDraft(lead: ImportedLead, error?: string): GeneratedLandingDraft {
  return {
    ...generateLandingDraft(lead),
    templatePhotoKey: selectTemplatePhotoKey(lead),
    generationProvider: "template",
    generationModel: null,
    generationPromptVersion: landingPromptVersion,
    generationStatus: error ? "fallback" : "completed",
    generationError: error ?? null
  };
}
