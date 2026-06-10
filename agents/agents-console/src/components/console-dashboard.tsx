"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, KeyRound, LogOut, RadioTower, RefreshCw, Rocket, Search, ShieldCheck, Wand2 } from "lucide-react";

type AgentHealth = {
  id: string;
  name: string;
  url: string;
  healthUrl: string;
  port: number;
  enabled: boolean;
  online: boolean;
  status: number;
  latencyMs: number;
};

type LandingDraft = {
  id: string;
  status: "draft" | "reviewed" | "archived";
  published: boolean;
  slug?: string | null;
  previewPath?: string | null;
  previewUrl?: string | null;
  heroHeadlineId: string;
  descriptionId: string;
  generationProvider?: string;
  generationModel?: string | null;
  generationStatus?: string;
  generationError?: string | null;
  templatePhotoKey?: string;
  updatedAt: string;
  importedLead: {
    id: string;
    name: string;
    category: string;
    phone?: string | null;
    address?: string | null;
  };
};

type OpenAiCredential = {
  provider: string;
  label: string;
  active: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: string | null;
  updatedAt: string;
} | null;

export function ConsoleDashboard({
  user
}: {
  user: { email: string; name?: string | null; role: string };
}) {
  const [agents, setAgents] = useState<AgentHealth[]>([]);
  const [drafts, setDrafts] = useState<LandingDraft[]>([]);
  const [published, setPublished] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [credential, setCredential] = useState<OpenAiCredential>(null);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedId) ?? drafts[0],
    [drafts, selectedId]
  );

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", status);
    params.set("published", published);
    if (query.trim()) params.set("q", query.trim());

    const [agentsResponse, landingResponse] = await Promise.all([
      fetch("/api/agents"),
      fetch(`/api/landing-pages?${params.toString()}`)
    ]);
    const agentsData = await agentsResponse.json();
    const landingData = await landingResponse.json();
    if (!agentsResponse.ok) throw new Error(agentsData.error ?? "Failed to load agents");
    if (!landingResponse.ok) throw new Error(landingData.error ?? "Failed to load landing pages");

    setAgents(agentsData.agents ?? []);
    setDrafts(landingData.drafts ?? []);
    const credentialResponse = await fetch("/api/settings/openai");
    const credentialData = await credentialResponse.json();
    if (credentialResponse.ok) setCredential(credentialData.credential ?? null);
  }, [published, query, status]);

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, [refresh]);

  useEffect(() => {
    if (selectedDraft) setSelectedId(selectedDraft.id);
  }, [selectedDraft]);

  async function mutate(id: string, action: "publish" | "unpublish") {
    setLoading(true);
    setMessage(`${action === "publish" ? "Publishing" : "Unpublishing"} landing page...`);
    try {
      const response = await fetch(`/api/landing-pages/${id}/${action}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `${action} failed`);
      setMessage(action === "publish" ? "Landing page published." : "Landing page unpublished.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setLoading(false);
    }
  }

  async function saveOpenAiKey() {
    setLoading(true);
    setMessage("Saving OpenAI key...");
    try {
      const response = await fetch("/api/settings/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, label: "OpenAI" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save OpenAI key");
      setCredential(data.credential);
      setApiKey("");
      setMessage("OpenAI key saved and tested.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save OpenAI key");
    } finally {
      setLoading(false);
    }
  }

  async function deleteOpenAiKey() {
    setLoading(true);
    setMessage("Removing OpenAI key...");
    try {
      const response = await fetch("/api/settings/openai", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to remove OpenAI key");
      setCredential(null);
      setMessage("OpenAI key removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to remove OpenAI key");
    } finally {
      setLoading(false);
    }
  }

  async function regenerateWithOpenAi(draftId: string) {
    setLoading(true);
    setMessage("Generating landing page with OpenAI...");
    try {
      const response = await fetch("/api/landing-pages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Generation failed");
      setMessage("Landing page regenerated.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  const stats = useMemo(
    () => ({
      agentsOnline: agents.filter((agent) => agent.online).length,
      published: drafts.filter((draft) => draft.published).length,
      drafts: drafts.length
    }),
    [agents, drafts]
  );

  return (
    <main className="min-h-screen bg-[#eef2f6] text-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6">
        <header className="flex flex-col gap-3 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Agents Console</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage configured agents, published previews, and generated landing pages.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-3 text-sm">
              <ShieldCheck size={16} />
              {user.email}
            </div>
            <button onClick={() => refresh()} className="inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-3 text-sm font-medium">
              <RefreshCw size={16} />
              Refresh
            </button>
            <button onClick={logout} className="inline-flex h-10 items-center gap-2 rounded bg-ink px-3 text-sm font-medium text-white">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Agents online" value={`${stats.agentsOnline}/${agents.length}`} />
          <Metric label="Landing pages" value={String(stats.drafts)} />
          <Metric label="Published" value={String(stats.published)} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="flex flex-col gap-5">
            <section className="rounded-lg border border-line bg-white">
              <div className="flex items-center gap-2 border-b border-line p-4">
                <RadioTower size={18} />
                <h2 className="text-lg font-semibold">Agents</h2>
              </div>
              <div className="divide-y divide-line">
                {agents.map((agent) => (
                  <div key={agent.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{agent.name}</div>
                        <div className="mt-1 text-xs text-slate-500">Port {agent.port}</div>
                      </div>
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${agent.online ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {agent.online ? "Online" : "Offline"}
                      </span>
                    </div>
                    <a href={agent.url} target="_blank" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-action">
                      Open <ExternalLink size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center gap-2">
                <KeyRound size={18} />
                <h2 className="text-lg font-semibold">OpenAI</h2>
              </div>
              <div className="mt-3 rounded border border-line bg-field px-3 py-2 text-sm text-slate-700">
                {credential?.active ? (
                  <span>
                    Key saved · test: {credential.lastTestStatus ?? "not tested"}
                  </span>
                ) : (
                  <span>No API key saved. Generation will use Landing Pages fallback if available.</span>
                )}
              </div>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                type="password"
                placeholder="Paste OpenAI API key"
                className="mt-3 h-10 w-full rounded border border-line bg-field px-3 text-sm"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading || !apiKey.trim()}
                  onClick={saveOpenAiKey}
                  className="h-10 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save Key
                </button>
                <button
                  type="button"
                  disabled={loading || !credential}
                  onClick={deleteOpenAiKey}
                  className="h-10 rounded border border-line bg-white px-4 text-sm font-semibold disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </section>

            {message ? (
              <div className="rounded border border-line bg-white px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            ) : null}
          </div>

          <section className="rounded-lg border border-line bg-white">
            <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Rocket size={18} />
                <h2 className="text-lg font-semibold">Landing Pages</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={15} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-10 w-56 rounded border border-line bg-field pl-9 pr-3 text-sm"
                    placeholder="Search pages"
                  />
                </div>
                <select value={published} onChange={(event) => setPublished(event.target.value)} className="h-10 rounded border border-line bg-field px-3 text-sm">
                  <option value="all">All publish states</option>
                  <option value="true">Published</option>
                  <option value="false">Unpublished</option>
                </select>
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded border border-line bg-field px-3 text-sm">
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="grid min-h-[620px] lg:grid-cols-[0.9fr_1.1fr]">
              <div className="max-h-[620px] overflow-y-auto border-r border-line">
                {drafts.map((draft) => (
                  <button
                    key={draft.id}
                    onClick={() => setSelectedId(draft.id)}
                    className={`block w-full border-b border-line p-4 text-left hover:bg-field ${selectedDraft?.id === draft.id ? "bg-[#edf7f2]" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{draft.importedLead.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{draft.importedLead.category}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {draft.generationProvider ?? "template"} · {draft.generationStatus ?? "completed"}
                        </div>
                      </div>
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${draft.published ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                        {draft.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{draft.descriptionId}</p>
                  </button>
                ))}
                {!drafts.length ? <div className="p-8 text-center text-sm text-slate-500">No landing pages found.</div> : null}
              </div>

              <div className="p-4">
                {selectedDraft ? (
                  <div className="flex h-full flex-col gap-4">
                    <div>
                      <div className="text-xs uppercase text-slate-500">{selectedDraft.status}</div>
                      <h3 className="mt-1 text-2xl font-semibold">{selectedDraft.heroHeadlineId}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{selectedDraft.descriptionId}</p>
                      <div className="mt-3 text-xs text-slate-500">
                        Generated by {selectedDraft.generationProvider ?? "template"}
                        {selectedDraft.generationModel ? ` (${selectedDraft.generationModel})` : ""} · {selectedDraft.generationStatus ?? "completed"}
                        {selectedDraft.generationError ? ` · fallback: ${selectedDraft.generationError}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={loading}
                        onClick={() => regenerateWithOpenAi(selectedDraft.id)}
                        className="inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold disabled:opacity-50"
                      >
                        <Wand2 size={15} />
                        Generate AI
                      </button>
                      {selectedDraft.published ? (
                        <button disabled={loading} onClick={() => mutate(selectedDraft.id, "unpublish")} className="h-10 rounded border border-line bg-white px-4 text-sm font-semibold disabled:opacity-50">
                          Unpublish
                        </button>
                      ) : (
                        <button disabled={loading} onClick={() => mutate(selectedDraft.id, "publish")} className="h-10 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-50">
                          Publish Preview
                        </button>
                      )}
                      {selectedDraft.previewUrl ? (
                        <a href={selectedDraft.previewUrl} target="_blank" className="inline-flex h-10 items-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-white">
                          Preview <ExternalLink size={15} />
                        </a>
                      ) : null}
                    </div>
                    {selectedDraft.previewUrl ? (
                      <iframe title="Landing page preview" src={selectedDraft.previewUrl} className="min-h-[420px] flex-1 rounded border border-line bg-white" />
                    ) : (
                      <div className="flex min-h-[420px] items-center justify-center rounded border border-dashed border-line bg-field text-sm text-slate-500">
                        Publish this draft to create a reachable preview URL.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No page selected.</div>
                )}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
