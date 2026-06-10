import { appConfig } from "@/lib/env";

export type LeadMapsLead = {
  id: string;
  name: string;
  category: string;
  status: "ready" | "candidate" | "ignored";
};

export async function runLeadSearch({
  location,
  category,
  radiusMeters
}: {
  location: string;
  category: string;
  radiusMeters: number;
}) {
  const response = await fetch(`${appConfig.leadMapsApiBase}/api/search-runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location, category, radiusMeters }),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Lead Maps search failed");
  return data as {
    run: { id: string };
    summary: { total: number; ready: number; candidate: number; ignored: number };
  };
}

export async function listLeadMapsLeads({
  searchRunId,
  status,
  category,
  limit
}: {
  searchRunId: string;
  status: "ready" | "candidate" | "ignored" | "all";
  category: string;
  limit: number;
}) {
  const params = new URLSearchParams();
  params.set("searchRunId", searchRunId);
  params.set("category", category);
  params.set("limit", String(limit));
  if (status !== "all") params.set("status", status);

  const response = await fetch(`${appConfig.leadMapsApiBase}/api/leads?${params.toString()}`, {
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Failed to load Lead Maps leads");
  return data as { leads: LeadMapsLead[] };
}
