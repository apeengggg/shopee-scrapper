import { getCurrentUser } from "@/lib/auth";
import { getOpenAiApiKey } from "@/lib/credentials";
import { apiError, json } from "@/lib/http";
import { generateLandingDraft, regenerateLandingDraft } from "@/lib/landing-api";
import { z } from "zod";

const generationInput = z.object({
  importedLeadId: z.string().optional(),
  draftId: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const input = generationInput.parse(await request.json());
    if (!input.draftId && !input.importedLeadId) {
      return json({ error: "draftId or importedLeadId is required" }, { status: 400 });
    }
    const apiKey = await getOpenAiApiKey();
    const result = input.draftId
      ? await regenerateLandingDraft({ draftId: input.draftId, apiKey })
      : await generateLandingDraft({
          importedLeadId: input.importedLeadId ?? "",
          apiKey
        });

    return json(result);
  } catch (error) {
    return apiError(error);
  }
}
