import { clearCurrentSession } from "@/lib/auth";
import { apiError, json } from "@/lib/http";

export async function POST() {
  try {
    await clearCurrentSession();
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
