import { z } from "zod";

export const loginInput = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export const landingListInput = z.object({
  status: z.enum(["draft", "reviewed", "archived", "all"]).default("all"),
  published: z.enum(["true", "false", "all"]).default("all"),
  q: z.string().trim().optional()
});

export const openAiCredentialInput = z.object({
  apiKey: z.string().trim().min(10),
  label: z.string().trim().min(2).default("OpenAI")
});

export const pipelineSettingsInput = z.object({
  defaultRadiusMeters: z.coerce.number().int().min(250).max(10000).default(2500),
  defaultLeadStatus: z.enum(["ready", "candidate", "ignored", "all"]).default("ready"),
  defaultMaxLeads: z.coerce.number().int().min(1).max(100).default(25),
  defaultPublishMode: z.enum(["review_first", "auto_publish"]).default("review_first"),
  defaultCategory: z.string().trim().min(2).max(120).default("dental clinic"),
  defaultLocation: z.string().trim().min(2).max(160).default("Jakarta Selatan")
});

export const leadToLandingPipelineInput = z.object({
  location: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(120),
  radiusMeters: z.coerce.number().int().min(250).max(10000).default(2500),
  leadStatusFilter: z.enum(["ready", "candidate", "ignored", "all"]).default("ready"),
  maxLeads: z.coerce.number().int().min(1).max(100).default(25),
  publishMode: z.enum(["review_first", "auto_publish"]).default("review_first")
});
