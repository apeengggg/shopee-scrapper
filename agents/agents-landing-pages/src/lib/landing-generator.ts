import type { ImportedLead } from "@prisma/client";

export type LandingDraftCopy = {
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
};

type LeadLike = Pick<
  ImportedLead,
  "name" | "category" | "businessType" | "phone" | "address" | "sourceStatus"
>;

export function generateLandingDraft(lead: LeadLike): LandingDraftCopy {
  const businessLabelId = clean(lead.businessType) ?? clean(lead.category) ?? "usaha lokal";
  const businessLabelEn = toEnglishBusinessLabel(businessLabelId);
  const areaId = areaFromAddress(lead.address) ?? "area sekitar";
  const areaEn = areaFromAddress(lead.address) ?? "the local area";
  const contactId = lead.phone
    ? `Hubungi ${lead.name} di ${lead.phone} untuk menanyakan layanan, jadwal, atau penawaran.`
    : `Hubungi ${lead.name} secara langsung untuk menanyakan layanan, jadwal, atau penawaran.`;
  const contactEn = lead.phone
    ? `Contact ${lead.name} at ${lead.phone} to ask about services, schedules, or offers.`
    : `Contact ${lead.name} directly to ask about services, schedules, or offers.`;

  return {
    descriptionId: `${lead.name} adalah ${businessLabelId} di ${areaId} yang dapat ditampilkan sebagai tujuan utama untuk calon pelanggan yang mencari informasi layanan, lokasi, dan cara menghubungi bisnis.`,
    descriptionEn: `${lead.name} is a ${businessLabelEn} in ${areaEn}, suitable for a landing page that helps prospective customers understand the service, location, and contact options.`,
    heroHeadlineId: `${lead.name}`,
    heroHeadlineEn: `${lead.name}`,
    heroSubheadlineId: `Landing page ringkas untuk memperkenalkan layanan ${businessLabelId}, menampilkan lokasi, dan memudahkan calon pelanggan menghubungi bisnis.`,
    heroSubheadlineEn: `A concise landing page for presenting ${businessLabelEn} services, showing the location, and helping prospects contact the business.`,
    servicesId: [
      `Informasi layanan ${businessLabelId}`,
      "Ringkasan lokasi dan area layanan",
      "Kontak cepat untuk calon pelanggan"
    ],
    servicesEn: [
      `${titleCase(businessLabelEn)} service information`,
      "Location and service-area summary",
      "Quick contact for prospective customers"
    ],
    trustPointsId: trustPointsId(lead),
    trustPointsEn: trustPointsEn(lead),
    ctaId: lead.phone ? "Hubungi Sekarang" : "Minta Informasi",
    ctaEn: lead.phone ? "Contact Now" : "Request Information",
    contactSectionId: contactId,
    contactSectionEn: contactEn
  };
}

function trustPointsId(lead: LeadLike) {
  return [
    lead.address ? `Alamat tersedia: ${lead.address}` : "Lokasi dapat dikonfirmasi langsung dengan bisnis",
    lead.phone ? "Nomor kontak tersedia untuk follow-up cepat" : "Kontak dapat dilengkapi saat proses follow-up",
    lead.sourceStatus === "ready"
      ? "Lead siap diproses karena belum memiliki website dan sudah memiliki nomor kontak"
      : "Lead dapat diperkaya sebelum penawaran landing page dikirim"
  ];
}

function trustPointsEn(lead: LeadLike) {
  return [
    lead.address ? `Address available: ${lead.address}` : "Location can be confirmed directly with the business",
    lead.phone ? "Contact number is available for quick follow-up" : "Contact details can be completed during follow-up",
    lead.sourceStatus === "ready"
      ? "Lead is ready because it has no website and includes a contact number"
      : "Lead can be enriched before sending a landing-page offer"
  ];
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function areaFromAddress(address?: string | null) {
  const parts = address
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts?.at(-1) ?? parts?.at(0);
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toEnglishBusinessLabel(value: string) {
  const normalized = value.toLowerCase();
  const dictionary: Record<string, string> = {
    "klinik gigi": "dental clinic",
    restoran: "restaurant",
    cafe: "cafe",
    apotek: "pharmacy",
    bengkel: "repair shop",
    hotel: "hotel",
    salon: "salon",
    toko: "store",
    business: "local business"
  };
  return dictionary[normalized] ?? value;
}
