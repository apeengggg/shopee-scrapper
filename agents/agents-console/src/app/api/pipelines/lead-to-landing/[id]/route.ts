import { getCurrentUser } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type PipelinePrisma = typeof prisma & {
  pipelineRun: {
    findUnique(args: unknown): Promise<unknown | null>;
  };
};

const db = prisma as unknown as PipelinePrisma;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const run = await db.pipelineRun.findUnique({
      where: { id }
    });
    if (!run) return json({ error: "Pipeline run not found" }, { status: 404 });

    return json({ run });
  } catch (error) {
    return apiError(error);
  }
}
