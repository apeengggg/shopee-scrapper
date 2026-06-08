import { z } from "zod";

export const searchRunInput = z.object({
  location: z.string().trim().min(2),
  category: z.string().trim().min(2),
  radiusMeters: z.coerce.number().int().min(250).max(10000).default(2500),
  campaignId: z.string().optional()
});

export const campaignInput = z.object({
  name: z.string().trim().min(2),
  location: z.string().trim().min(2),
  category: z.string().trim().min(2),
  radiusMeters: z.coerce.number().int().min(250).max(10000).default(2500),
  scheduleMinutes: z.coerce.number().int().min(60).max(43200).default(1440),
  active: z.boolean().default(true)
});

export const leadPatchInput = z.object({
  status: z.enum(["ready", "candidate", "ignored"]).optional(),
  notes: z.string().trim().max(1000).nullable().optional()
});
