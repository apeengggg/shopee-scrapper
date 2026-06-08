import { prisma } from "@/lib/prisma";
import { createAndRunSearch } from "@/lib/search-runner";
import { searchRunInput } from "@/lib/validators";
import { apiError, json } from "@/lib/http";

export async function GET() {
  try {
    const runs = await prisma.searchRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { leads: true }
    });

    return json({ runs });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = searchRunInput.parse(await request.json());
    const result = await createAndRunSearch(input);
    return json(result);
  } catch (error) {
    return apiError(error);
  }
}
