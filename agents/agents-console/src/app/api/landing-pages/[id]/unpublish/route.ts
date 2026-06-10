import { getCurrentUser } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { unpublishLandingDraft } from "@/lib/landing-api";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const data = await unpublishLandingDraft(id);
    return json(data);
  } catch (error) {
    return apiError(error);
  }
}
