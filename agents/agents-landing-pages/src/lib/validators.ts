import { z } from "zod";

export const importLeadsInput = z.object({
  status: z.enum(["ready", "candidate", "ignored", "all"]).default("ready")
});

export const createDraftInput = z.object({
  importedLeadId: z.string().min(1)
});

const stringArray = z.array(z.string().trim().min(1)).min(1).max(8);

export const draftPatchInput = z.object({
  status: z.enum(["draft", "reviewed", "archived"]).optional(),
  descriptionId: z.string().trim().min(1).optional(),
  descriptionEn: z.string().trim().min(1).optional(),
  heroHeadlineId: z.string().trim().min(1).optional(),
  heroHeadlineEn: z.string().trim().min(1).optional(),
  heroSubheadlineId: z.string().trim().min(1).optional(),
  heroSubheadlineEn: z.string().trim().min(1).optional(),
  servicesId: stringArray.optional(),
  servicesEn: stringArray.optional(),
  trustPointsId: stringArray.optional(),
  trustPointsEn: stringArray.optional(),
  ctaId: z.string().trim().min(1).optional(),
  ctaEn: z.string().trim().min(1).optional(),
  contactSectionId: z.string().trim().min(1).optional(),
  contactSectionEn: z.string().trim().min(1).optional()
});

export const draftListInput = z.object({
  status: z.enum(["draft", "reviewed", "archived", "all"]).default("all"),
  published: z.enum(["true", "false", "all"]).default("all"),
  q: z.string().trim().optional()
});
