import { getCurrentUser } from "@/lib/auth";
import { getAgentHealth } from "@/lib/agents-config";
import { json } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const agents = await getAgentHealth();
  return json({ agents });
}
