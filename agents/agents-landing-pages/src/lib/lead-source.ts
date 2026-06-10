import type { LeadStatus } from "@prisma/client";
import { appConfig } from "@/lib/env";

export type SourceLead = {
  id: string;
  name: string;
  category: string;
  businessType?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: LeadStatus;
};

export async function fetchSourceLeads(status: LeadStatus | "all") {
  const params = new URLSearchParams();
  params.set("status", status);

  const response = await fetch(`${appConfig.leadMapsApiBase}/api/leads?${params.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Lead Maps API returned ${response.status}`);
  }

  const data = (await response.json()) as { leads?: SourceLead[] };
  return data.leads ?? [];
}
