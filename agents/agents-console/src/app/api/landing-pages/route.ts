import { getCurrentUser } from "@/lib/auth";
import { json, apiError } from "@/lib/http";
import { listLandingDrafts, previewUrl } from "@/lib/landing-api";
import { landingListInput } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const input = landingListInput.parse({
      status: url.searchParams.get("status") ?? "all",
      published: url.searchParams.get("published") ?? "all",
      q: url.searchParams.get("q") ?? undefined
    });
    const params = new URLSearchParams();
    params.set("status", input.status);
    params.set("published", input.published);
    if (input.q) params.set("q", input.q);
    const data = await listLandingDrafts(params);

    return json({
      drafts: data.drafts.map((draft) => ({
        ...draft,
        previewUrl: previewUrl(draft.previewPath)
      }))
    });
  } catch (error) {
    return apiError(error);
  }
}
