import { describe, expect, it } from "vitest";
import { generateLandingDraft } from "@/lib/landing-generator";

const baseLead = {
  name: "Klinik Gigi Senyum",
  category: "klinik gigi",
  businessType: "klinik gigi",
  phone: "+62 812-0000-0000",
  address: "Jl. Merdeka 10, Bandung",
  sourceStatus: "ready" as const
};

describe("generateLandingDraft", () => {
  it("generates bilingual copy for a complete lead", () => {
    const draft = generateLandingDraft(baseLead);

    expect(draft.descriptionId).toContain("Klinik Gigi Senyum");
    expect(draft.descriptionEn).toContain("dental clinic");
    expect(draft.contactSectionId).toContain("+62 812-0000-0000");
    expect(draft.servicesId).toHaveLength(3);
    expect(draft.servicesEn).toHaveLength(3);
  });

  it("does not invent a phone number when one is missing", () => {
    const draft = generateLandingDraft({ ...baseLead, phone: null, sourceStatus: "candidate" });

    expect(draft.ctaId).toBe("Minta Informasi");
    expect(draft.contactSectionId).toContain("secara langsung");
    expect(draft.contactSectionEn).toContain("directly");
  });

  it("uses neutral location copy when address is missing", () => {
    const draft = generateLandingDraft({ ...baseLead, address: null });

    expect(draft.descriptionId).toContain("area sekitar");
    expect(draft.trustPointsId[0]).toContain("Lokasi dapat dikonfirmasi");
  });
});
