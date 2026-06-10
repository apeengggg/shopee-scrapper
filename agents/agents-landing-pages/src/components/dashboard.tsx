"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DownloadCloud, FileText, Languages, RefreshCw, Save, Wand2 } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { getTemplatePhoto } from "@/lib/template-photos";

type LeadStatus = "ready" | "candidate" | "ignored";
type DraftStatus = "draft" | "reviewed" | "archived";

type LandingDraft = {
  id: string;
  status: DraftStatus;
  descriptionId: string;
  descriptionEn: string;
  heroHeadlineId: string;
  heroHeadlineEn: string;
  heroSubheadlineId: string;
  heroSubheadlineEn: string;
  servicesId: string[];
  servicesEn: string[];
  trustPointsId: string[];
  trustPointsEn: string[];
  ctaId: string;
  ctaEn: string;
  contactSectionId: string;
  contactSectionEn: string;
  generationProvider?: string;
  generationModel?: string | null;
  generationStatus?: string;
  generationError?: string | null;
  templatePhotoKey?: string;
};

type ImportedLead = {
  id: string;
  sourceLeadId: string;
  name: string;
  category: string;
  businessType?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  sourceStatus: LeadStatus;
  drafts: LandingDraft[];
};

const emptyDraft: LandingDraft = {
  id: "",
  status: "draft",
  descriptionId: "",
  descriptionEn: "",
  heroHeadlineId: "",
  heroHeadlineEn: "",
  heroSubheadlineId: "",
  heroSubheadlineEn: "",
  servicesId: [""],
  servicesEn: [""],
  trustPointsId: [""],
  trustPointsEn: [""],
  ctaId: "",
  ctaEn: "",
  contactSectionId: "",
  contactSectionEn: "",
  generationProvider: "template",
  generationModel: null,
  generationStatus: "completed",
  generationError: null,
  templatePhotoKey: "generic"
};

export function Dashboard() {
  const [sourceStatus, setSourceStatus] = useState<LeadStatus | "all">("ready");
  const [listStatus, setListStatus] = useState<LeadStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<ImportedLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [draft, setDraft] = useState<LandingDraft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? leads[0],
    [leads, selectedLeadId]
  );

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", listStatus);
    if (query.trim()) params.set("q", query.trim());

    const response = await fetch(`/api/imported-leads?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to load leads");
    setLeads(data.leads ?? []);
  }, [listStatus, query]);

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, [refresh]);

  useEffect(() => {
    if (!selectedLead) {
      setSelectedLeadId("");
      setDraft(emptyDraft);
      return;
    }

    setSelectedLeadId(selectedLead.id);
    setDraft(selectedLead.drafts[0] ?? emptyDraft);
  }, [selectedLead]);

  async function importLeads() {
    setLoading(true);
    setMessage("Importing leads from Lead Maps Agent...");
    try {
      const response = await fetch("/api/import-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: sourceStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Import failed");
      setMessage(`Imported ${data.imported} leads: ${data.created} new, ${data.updated} updated.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function generateDraft(leadId = selectedLead?.id) {
    if (!leadId) return;
    setLoading(true);
    setMessage("Generating bilingual landing-page draft...");
    try {
      const response = await fetch("/api/landing-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importedLeadId: leadId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Generation failed");
      setDraft(data.draft);
      setSelectedLeadId(leadId);
      setMessage("Draft generated.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    if (!draft.id) return;
    setLoading(true);
    setMessage("Saving draft...");
    try {
      const response = await fetch(`/api/landing-drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Save failed");
      setDraft(data.draft);
      setMessage("Draft saved.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const withDraft = leads.filter((lead) => lead.drafts.length > 0).length;
    return { total: leads.length, withDraft, withoutDraft: leads.length - withDraft };
  }, [leads]);

  return (
    <main className="min-h-screen bg-[#f3f5f0] text-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6">
        <header className="flex flex-col gap-3 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Landing Page Agent</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Import lead bisnis dari Lead Maps Agent, buat deskripsi bilingual, lalu susun draft landing page yang siap diedit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-3 text-sm font-medium"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Imported leads" value={stats.total} />
          <Metric label="With draft" value={stats.withDraft} />
          <Metric label="Needs draft" value={stats.withoutDraft} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-line bg-white">
            <div className="border-b border-line p-4">
              <div className="mb-4 flex items-center gap-2">
                <DownloadCloud size={18} />
                <h2 className="text-lg font-semibold">Import Leads</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={sourceStatus}
                  onChange={(event) => setSourceStatus(event.target.value as LeadStatus | "all")}
                  className="h-10 rounded border border-line bg-field px-3 text-sm"
                >
                  <option value="ready">Ready from maps</option>
                  <option value="candidate">Candidate from maps</option>
                  <option value="all">All leads</option>
                </select>
                <button
                  type="button"
                  disabled={loading}
                  onClick={importLeads}
                  className="inline-flex h-10 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <DownloadCloud size={16} />
                  Import
                </button>
              </div>
            </div>

            <div className="border-b border-line p-4">
              <div className="flex flex-wrap gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search lead, category, phone"
                  className="h-10 flex-1 rounded border border-line bg-field px-3 text-sm"
                />
                <select
                  value={listStatus}
                  onChange={(event) => setListStatus(event.target.value as LeadStatus | "all")}
                  className="h-10 rounded border border-line bg-field px-3 text-sm"
                >
                  <option value="all">All local leads</option>
                  <option value="ready">Ready</option>
                  <option value="candidate">Candidate</option>
                  <option value="ignored">Ignored</option>
                </select>
              </div>
            </div>

            <div className="max-h-[620px] overflow-y-auto">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => {
                    setSelectedLeadId(lead.id);
                    setDraft(lead.drafts[0] ?? emptyDraft);
                  }}
                  className={`block w-full border-b border-line p-4 text-left hover:bg-field ${
                    selectedLead?.id === lead.id ? "bg-[#edf7f2]" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{lead.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{lead.category}</div>
                    </div>
                    <StatusPill status={lead.sourceStatus} />
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{lead.address ?? "No address yet"}</div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{lead.phone ?? "No phone"}</span>
                    <span>{lead.drafts.length ? "Draft ready" : "Needs draft"}</span>
                  </div>
                </button>
              ))}
              {!leads.length ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No imported leads yet. Import from the maps agent first.
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <section className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText size={18} />
                    <h2 className="text-lg font-semibold">{selectedLead?.name ?? "No lead selected"}</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedLead?.businessType ?? selectedLead?.category ?? "Import a lead to start."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading || !selectedLead}
                  onClick={() => generateDraft()}
                  className="inline-flex h-10 items-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Wand2 size={16} />
                  Generate Draft
                </button>
              </div>
              {message ? (
                <div className="mt-4 rounded border border-line bg-field px-3 py-2 text-sm text-slate-700">
                  {message}
                </div>
              ) : null}
            </section>

            {draft.id ? (
              <form onSubmit={saveDraft} className="rounded-lg border border-line bg-white p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Languages size={18} />
                    <h2 className="text-lg font-semibold">Bilingual Draft</h2>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-10 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Save size={16} />
                    Save
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextArea label="Deskripsi ID" value={draft.descriptionId} onChange={(value) => setDraft({ ...draft, descriptionId: value })} />
                  <TextArea label="Description EN" value={draft.descriptionEn} onChange={(value) => setDraft({ ...draft, descriptionEn: value })} />
                  <Field label="Hero ID" value={draft.heroHeadlineId} onChange={(value) => setDraft({ ...draft, heroHeadlineId: value })} />
                  <Field label="Hero EN" value={draft.heroHeadlineEn} onChange={(value) => setDraft({ ...draft, heroHeadlineEn: value })} />
                  <TextArea label="Subheadline ID" value={draft.heroSubheadlineId} onChange={(value) => setDraft({ ...draft, heroSubheadlineId: value })} />
                  <TextArea label="Subheadline EN" value={draft.heroSubheadlineEn} onChange={(value) => setDraft({ ...draft, heroSubheadlineEn: value })} />
                  <ListEditor label="Services ID" values={draft.servicesId} onChange={(values) => setDraft({ ...draft, servicesId: values })} />
                  <ListEditor label="Services EN" values={draft.servicesEn} onChange={(values) => setDraft({ ...draft, servicesEn: values })} />
                  <ListEditor label="Trust ID" values={draft.trustPointsId} onChange={(values) => setDraft({ ...draft, trustPointsId: values })} />
                  <ListEditor label="Trust EN" values={draft.trustPointsEn} onChange={(values) => setDraft({ ...draft, trustPointsEn: values })} />
                  <Field label="CTA ID" value={draft.ctaId} onChange={(value) => setDraft({ ...draft, ctaId: value })} />
                  <Field label="CTA EN" value={draft.ctaEn} onChange={(value) => setDraft({ ...draft, ctaEn: value })} />
                  <TextArea label="Contact ID" value={draft.contactSectionId} onChange={(value) => setDraft({ ...draft, contactSectionId: value })} />
                  <TextArea label="Contact EN" value={draft.contactSectionEn} onChange={(value) => setDraft({ ...draft, contactSectionEn: value })} />
                </div>
              </form>
            ) : null}

            {draft.id ? <Preview draft={draft} lead={selectedLead} /> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded border border-line bg-field px-3 text-sm font-normal text-ink"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="rounded border border-line bg-field px-3 py-2 text-sm font-normal text-ink"
      />
    </label>
  );
}

function ListEditor({
  label,
  values,
  onChange
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      {values.map((value, index) => (
        <input
          key={index}
          value={value}
          onChange={(event) => {
            const next = [...values];
            next[index] = event.target.value;
            onChange(next);
          }}
          className="h-10 rounded border border-line bg-field px-3 text-sm font-normal text-ink"
        />
      ))}
    </div>
  );
}

function Preview({ draft, lead }: { draft: LandingDraft; lead?: ImportedLead }) {
  const photo = getTemplatePhoto(draft.templatePhotoKey);
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="bg-[#12312a] px-5 py-8 text-white">
        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <div className="text-sm text-[#b9d7c9]">{lead?.category}</div>
            <h2 className="mt-2 text-3xl font-semibold">{draft.heroHeadlineId}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d7e8df]">{draft.heroSubheadlineId}</p>
            <button className="mt-5 rounded bg-[#f2b84b] px-4 py-2 text-sm font-semibold text-[#172017]" type="button">
              {draft.ctaId}
            </button>
          </div>
          <img src={photo.path} alt={photo.alt} className="aspect-[5/3] w-full rounded object-cover" />
        </div>
      </div>
      <div className="border-b border-line bg-field px-5 py-3 text-xs text-slate-600">
        Generated by {draft.generationProvider ?? "template"}
        {draft.generationModel ? ` (${draft.generationModel})` : ""} · {draft.generationStatus ?? "completed"}
        {draft.generationError ? ` · fallback: ${draft.generationError}` : ""}
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-2">
        <div>
          <h3 className="font-semibold">Deskripsi</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{draft.descriptionId}</p>
        </div>
        <div>
          <h3 className="font-semibold">Description</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{draft.descriptionEn}</p>
        </div>
        <PreviewList title="Layanan" items={draft.servicesId} />
        <PreviewList title="Services" items={draft.servicesEn} />
        <PreviewList title="Kepercayaan" items={draft.trustPointsId} />
        <PreviewList title="Trust" items={draft.trustPointsEn} />
      </div>
      <div className="border-t border-line bg-field p-5 text-sm text-slate-700">
        <div>{draft.contactSectionId}</div>
        <div className="mt-1">{draft.contactSectionEn}</div>
      </div>
    </section>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-slate-600">
        {items.map((item, index) => (
          <li key={index} className="rounded border border-line bg-field px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
