import { appConfig } from "@/lib/env";

export type ConsoleLandingDraft = {
  id: string;
  status: "draft" | "reviewed" | "archived";
  published: boolean;
  publishedAt?: string | null;
  slug?: string | null;
  previewPath?: string | null;
  heroHeadlineId: string;
  descriptionId: string;
  updatedAt: string;
  importedLead: {
    id: string;
    name: string;
    category: string;
    phone?: string | null;
    address?: string | null;
  };
};

export async function listLandingDrafts(params: URLSearchParams) {
  const response = await fetch(
    `${appConfig.landingPagesApiBase}/api/landing-drafts?${params.toString()}`,
    { cache: "no-store" }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Landing Pages API failed");
  return data as { drafts: ConsoleLandingDraft[] };
}

export async function publishLandingDraft(id: string) {
  return mutateDraft(id, "publish");
}

export async function unpublishLandingDraft(id: string) {
  return mutateDraft(id, "unpublish");
}

export async function generateLandingDraft({
  importedLeadId,
  apiKey
}: {
  importedLeadId: string;
  apiKey?: string | null;
}) {
  const response = await fetch(`${appConfig.landingPagesApiBase}/api/landing-drafts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-openai-api-key": apiKey } : {})
    },
    body: JSON.stringify({ importedLeadId, mode: "openai" }),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Failed to generate draft");
  return data;
}

export async function regenerateLandingDraft({
  draftId,
  apiKey
}: {
  draftId: string;
  apiKey?: string | null;
}) {
  const response = await fetch(`${appConfig.landingPagesApiBase}/api/landing-drafts/${draftId}/regenerate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-openai-api-key": apiKey } : {})
    },
    body: JSON.stringify({ mode: "openai" }),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Failed to regenerate draft");
  return data;
}

export function previewUrl(path?: string | null) {
  return path ? `${appConfig.landingPagesPublicUrl}${path}` : null;
}

async function mutateDraft(id: string, action: "publish" | "unpublish") {
  const response = await fetch(
    `${appConfig.landingPagesApiBase}/api/landing-drafts/${id}/${action}`,
    { method: "POST", cache: "no-store" }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `Failed to ${action} draft`);
  return data;
}
