import { getCurrentUser } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { previewUrl, publishLandingDraft } from "@/lib/landing-api";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const data = await publishLandingDraft(id);
    return json({
      ...data,
      previewUrl: previewUrl(data.draft.previewPath)
    });
  } catch (error) {
    return apiError(error);
  }
}
