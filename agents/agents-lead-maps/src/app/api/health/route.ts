import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({
      ok: true,
      service: "lead-maps-agent",
      database: "ok",
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return json(
      {
        ok: false,
        service: "lead-maps-agent",
        database: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    );
  }
}
