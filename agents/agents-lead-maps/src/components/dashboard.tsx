"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Download, Play, RefreshCw, Search, Timer } from "lucide-react";
import { StatusPill } from "@/components/status-pill";

type Lead = {
  id: string;
  name: string;
  category: string;
  businessType?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: "ready" | "candidate" | "ignored";
};

type Campaign = {
  id: string;
  name: string;
  location: string;
  category: string;
  radiusMeters: number;
  scheduleMinutes: number;
  active: boolean;
  nextRunAt: string;
};

const defaultSearch = {
  location: "Bandung",
  category: "klinik gigi",
  radiusMeters: 2500
};

export function Dashboard() {
  const [searchForm, setSearchForm] = useState(defaultSearch);
  const [campaignForm, setCampaignForm] = useState({
    name: "Prospek Bandung Klinik Gigi",
    ...defaultSearch,
    scheduleMinutes: 1440
  });
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", status);
    if (appliedQuery.trim()) params.set("q", appliedQuery.trim());

    const [leadResponse, campaignResponse] = await Promise.all([
      fetch(`/api/leads?${params.toString()}`),
      fetch("/api/campaigns")
    ]);
    const leadData = await leadResponse.json();
    const campaignData = await campaignResponse.json();
    setLeads(leadData.leads ?? []);
    setCampaigns(campaignData.campaigns ?? []);
  }, [appliedQuery, status]);

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, [refresh]);

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("Menjalankan pencarian...");
    try {
      const response = await fetch("/api/search-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Search failed");
      setMessage(
        `Selesai: ${data.summary.total} bisnis, ${data.summary.ready} siap kontak, ${data.summary.candidate} kandidat.`
      );
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitCampaign(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("Membuat campaign...");
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...campaignForm, active: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Campaign failed");
      setMessage("Campaign tersimpan dan siap dijalankan oleh worker.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Campaign failed");
    } finally {
      setLoading(false);
    }
  }

  async function runDueCampaigns() {
    setLoading(true);
    setMessage("Menjalankan campaign yang jatuh tempo...");
    try {
      const response = await fetch("/api/campaigns/run-due", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Run due failed");
      setMessage(`Campaign run selesai: ${data.results.length} campaign.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run due failed");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    return {
      ready: leads.filter((lead) => lead.status === "ready").length,
      candidate: leads.filter((lead) => lead.status === "candidate").length,
      ignored: leads.filter((lead) => lead.status === "ignored").length
    };
  }, [leads]);

  return (
    <main className="min-h-screen bg-[#eef2f6]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6">
        <header className="flex flex-col gap-3 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-ink">Lead Maps Agent</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Cari usaha dari OpenStreetMap yang belum punya website, simpan nomor dan kandidat untuk penawaran landing page atau website perusahaan.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => refresh()}
              className="inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-3 text-sm font-medium text-ink"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <a
              href={`/api/leads/export?status=${status}`}
              className="inline-flex h-10 items-center gap-2 rounded bg-action px-3 text-sm font-medium text-white"
            >
              <Download size={16} />
              Export CSV
            </a>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Siap kontak" value={stats.ready} />
          <Metric label="Kandidat tanpa nomor" value={stats.candidate} />
          <Metric label="Diabaikan" value={stats.ignored} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <form onSubmit={submitSearch} className="rounded-lg border border-line bg-white p-4">
            <div className="mb-4 flex items-center gap-2">
              <Search size={18} />
              <h2 className="text-lg font-semibold">Pencarian Manual</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="Lokasi"
                value={searchForm.location}
                onChange={(value) => setSearchForm({ ...searchForm, location: value })}
              />
              <Field
                label="Kategori"
                value={searchForm.category}
                onChange={(value) => setSearchForm({ ...searchForm, category: value })}
              />
              <Field
                label="Radius meter"
                type="number"
                value={String(searchForm.radiusMeters)}
                onChange={(value) =>
                  setSearchForm({ ...searchForm, radiusMeters: Number(value) })
                }
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Play size={16} />
              Jalankan Search
            </button>
          </form>

          <form onSubmit={submitCampaign} className="rounded-lg border border-line bg-white p-4">
            <div className="mb-4 flex items-center gap-2">
              <Timer size={18} />
              <h2 className="text-lg font-semibold">Scheduled Campaign</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Nama campaign"
                value={campaignForm.name}
                onChange={(value) => setCampaignForm({ ...campaignForm, name: value })}
              />
              <Field
                label="Interval menit"
                type="number"
                value={String(campaignForm.scheduleMinutes)}
                onChange={(value) =>
                  setCampaignForm({ ...campaignForm, scheduleMinutes: Number(value) })
                }
              />
              <Field
                label="Lokasi"
                value={campaignForm.location}
                onChange={(value) => setCampaignForm({ ...campaignForm, location: value })}
              />
              <Field
                label="Kategori"
                value={campaignForm.category}
                onChange={(value) => setCampaignForm({ ...campaignForm, category: value })}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Simpan Campaign
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={runDueCampaigns}
                className="inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold text-ink disabled:opacity-50"
              >
                Run Due
              </button>
            </div>
          </form>
        </section>

        {message ? (
          <div className="rounded border border-line bg-white px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

        <section className="rounded-lg border border-line bg-white">
          <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Leads</h2>
            <div className="flex flex-wrap gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setAppliedQuery(query);
                }}
                placeholder="Cari nama, nomor, alamat"
                className="h-10 w-64 rounded border border-line bg-field px-3 text-sm"
              />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 rounded border border-line bg-field px-3 text-sm"
              >
                <option value="all">Semua status</option>
                <option value="ready">Ready</option>
                <option value="candidate">Candidate</option>
                <option value="ignored">Ignored</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setAppliedQuery(query);
                }}
                className="h-10 rounded bg-ink px-3 text-sm font-medium text-white"
              >
                Filter
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-field text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Usaha</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Alamat</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{lead.name}</div>
                      <div className="text-xs text-slate-500">{lead.businessType}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{lead.phone ?? "Belum ada nomor"}</div>
                      <div className="text-xs text-slate-500">{lead.website ?? "Tidak ada website"}</div>
                    </td>
                    <td className="px-4 py-3">{lead.category}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={lead.status} />
                    </td>
                    <td className="max-w-sm px-4 py-3 text-slate-600">{lead.address ?? "-"}</td>
                  </tr>
                ))}
                {!leads.length ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                      Belum ada leads. Jalankan pencarian manual atau campaign.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Campaign Aktif</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded border border-line p-3">
                <div className="font-semibold">{campaign.name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {campaign.location} · {campaign.category} · tiap {campaign.scheduleMinutes} menit
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Next run: {new Date(campaign.nextRunAt).toLocaleString("id-ID")}
                </div>
              </div>
            ))}
            {!campaigns.length ? (
              <div className="text-sm text-slate-500">Belum ada scheduled campaign.</div>
            ) : null}
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
      <div className="mt-2 text-3xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded border border-line bg-field px-3 text-sm font-normal text-ink"
      />
    </label>
  );
}
