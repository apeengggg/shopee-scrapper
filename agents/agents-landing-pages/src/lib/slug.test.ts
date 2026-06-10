import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("creates readable slugs from business names", () => {
    expect(slugify("Klinik Gigi Senyum Bandung")).toBe("klinik-gigi-senyum-bandung");
  });

  it("strips punctuation and trims separators", () => {
    expect(slugify("  Cafe & Resto!  ")).toBe("cafe-resto");
  });
});
