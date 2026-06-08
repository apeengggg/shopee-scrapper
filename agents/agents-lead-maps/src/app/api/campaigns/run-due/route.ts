import { runDueCampaigns } from "@/lib/search-runner";
import { apiError, json } from "@/lib/http";

export async function POST() {
  try {
    const results = await runDueCampaigns();
    return json({ results });
  } catch (error) {
    return apiError(error);
  }
}
