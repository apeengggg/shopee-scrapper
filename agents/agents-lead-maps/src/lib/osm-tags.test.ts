import { describe, expect, it } from "vitest";
import { categoryToOverpassFilters } from "@/lib/osm-tags";

describe("categoryToOverpassFilters", () => {
  it("uses specific tags for known categories", () => {
    expect(categoryToOverpassFilters("klinik gigi")).toContain('["amenity"="dentist"]');
  });

  it("falls back to name and generic business tags for unknown categories", () => {
    const filters = categoryToOverpassFilters("studio foto");

    expect(filters[0]).toContain('"name"~"studio foto"');
    expect(filters).toContain('["shop"]');
    expect(filters).toContain('["amenity"]');
  });
});
