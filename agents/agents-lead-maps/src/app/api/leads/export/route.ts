import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const leads = await prisma.lead.findMany({
    where: { status: isLeadStatus(status) ? status : undefined },
    orderBy: { lastSeenAt: "desc" }
  });

  const header = [
    "name",
    "category",
    "businessType",
    "phone",
    "website",
    "status",
    "address",
    "latitude",
    "longitude",
    "source"
  ];

  const rows = leads.map((lead) =>
    header.map((key) => csvCell(String(lead[key as keyof typeof lead] ?? ""))).join(",")
  );

  return new Response([header.join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=leads.csv"
    }
  });
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function isLeadStatus(value: string | null) {
  return value === "ready" || value === "candidate" || value === "ignored";
}
