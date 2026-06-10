import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function PublishedLandingPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const draft = await prisma.landingDraft.findUnique({
    where: { slug },
    include: { importedLead: true }
  });

  if (!draft?.published) notFound();

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#172017]">
      <section className="bg-[#12312a] px-6 py-16 text-white md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-sm font-medium text-[#b9d7c9]">{draft.importedLead.category}</div>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal md:text-6xl">
            {draft.heroHeadlineId}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#d7e8df]">
            {draft.heroSubheadlineId}
          </p>
          <a
            href={draft.importedLead.phone ? `tel:${draft.importedLead.phone}` : "#contact"}
            className="mt-8 inline-flex rounded bg-[#f2b84b] px-5 py-3 text-sm font-semibold text-[#172017]"
          >
            {draft.ctaId}
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-6 py-12 md:grid-cols-2 md:px-12">
        <div>
          <h2 className="text-2xl font-semibold">Tentang Bisnis</h2>
          <p className="mt-3 leading-7 text-slate-700">{draft.descriptionId}</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Business Overview</h2>
          <p className="mt-3 leading-7 text-slate-700">{draft.descriptionEn}</p>
        </div>
      </section>

      <section className="border-y border-[#d9e0d5] bg-white px-6 py-12 md:px-12">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <List title="Layanan" items={draft.servicesId} />
          <List title="Services" items={draft.servicesEn} />
          <List title="Kepercayaan" items={draft.trustPointsId} />
          <List title="Trust Points" items={draft.trustPointsEn} />
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-5xl px-6 py-12 md:px-12">
        <h2 className="text-2xl font-semibold">Kontak</h2>
        <p className="mt-3 leading-7 text-slate-700">{draft.contactSectionId}</p>
        <p className="mt-2 leading-7 text-slate-700">{draft.contactSectionEn}</p>
        {draft.importedLead.address ? (
          <p className="mt-5 text-sm text-slate-600">{draft.importedLead.address}</p>
        ) : null}
      </section>
    </main>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={index} className="rounded border border-[#d9e0d5] bg-[#f7f8f3] px-4 py-3 text-sm text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
