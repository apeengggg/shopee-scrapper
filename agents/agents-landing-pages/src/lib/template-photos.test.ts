import { describe, expect, it } from "vitest";
import { getTemplatePhoto, selectTemplatePhotoKey } from "@/lib/template-photos";

describe("template photos", () => {
  it("selects a dental template for dental leads", () => {
    expect(selectTemplatePhotoKey({ category: "klinik gigi", businessType: null })).toBe("dental");
  });

  it("falls back to generic for unknown categories", () => {
    expect(selectTemplatePhotoKey({ category: "unknown", businessType: null })).toBe("generic");
    expect(getTemplatePhoto("missing").key).toBe("generic");
  });
});
