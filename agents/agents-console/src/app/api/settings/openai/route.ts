import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/credentials";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { openAiCredentialInput } from "@/lib/validators";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const credential = await prisma.integrationCredential.findUnique({
      where: { provider: "openai" },
      select: {
        provider: true,
        label: true,
        active: true,
        lastTestedAt: true,
        lastTestStatus: true,
        updatedAt: true
      }
    });

    return json({ credential });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return json({ error: "Forbidden" }, { status: 403 });

    const input = openAiCredentialInput.parse(await request.json());
    const encrypted = encryptSecret(input.apiKey);
    const testStatus = await testOpenAiKey(input.apiKey);

    const credential = await prisma.integrationCredential.upsert({
      where: { provider: "openai" },
      create: {
        provider: "openai",
        label: input.label,
        active: true,
        ...encrypted,
        lastTestedAt: new Date(),
        lastTestStatus: testStatus
      },
      update: {
        label: input.label,
        active: true,
        ...encrypted,
        lastTestedAt: new Date(),
        lastTestStatus: testStatus
      },
      select: {
        provider: true,
        label: true,
        active: true,
        lastTestedAt: true,
        lastTestStatus: true,
        updatedAt: true
      }
    });

    return json({ credential });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return json({ error: "Forbidden" }, { status: 403 });

    await prisma.integrationCredential.deleteMany({ where: { provider: "openai" } });
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

async function testOpenAiKey(apiKey: string) {
  try {
    const client = new OpenAI({ apiKey });
    await client.models.list();
    return "ok";
  } catch (error) {
    return error instanceof Error ? error.message : "test failed";
  }
}
