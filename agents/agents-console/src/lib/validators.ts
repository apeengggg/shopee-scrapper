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
