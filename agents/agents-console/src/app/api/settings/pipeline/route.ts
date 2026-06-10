import { getCurrentUser } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { pipelineSettingsInput } from "@/lib/validators";

const settingKey = "lead-to-landing-pipeline";

type ConsoleSettingsPrisma = typeof prisma & {
  consoleSetting: {
    findUnique(args: unknown): Promise<{ value: unknown } | null>;
    upsert(args: unknown): Promise<unknown>;
  };
};

const db = prisma as unknown as ConsoleSettingsPrisma;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const setting = await db.consoleSetting.findUnique({
      where: { key: settingKey }
    });

    return json({
      settings: pipelineSettingsInput.parse(setting?.value ?? {})
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return json({ error: "Forbidden" }, { status: 403 });

    const settings = pipelineSettingsInput.parse(await request.json());
    await db.consoleSetting.upsert({
      where: { key: settingKey },
      create: { key: settingKey, value: settings },
      update: { value: settings }
    });

    return json({ settings });
  } catch (error) {
    return apiError(error);
  }
}
