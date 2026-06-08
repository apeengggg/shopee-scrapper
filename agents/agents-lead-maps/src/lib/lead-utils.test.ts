import { describe, expect, it } from "vitest";
import {
  businessType,
  classifyLead,
  normalizeAddress,
  normalizePhone,
  normalizeWebsite
} from "@/lib/lead-utils";

describe("lead utils", () => {
  it("classifies ready leads when website is empty and phone exists", () => {
    expect(classifyLead(undefined, "+62 812 0000")).toBe("ready");
  });

  it("classifies candidate leads when website and phone are empty", () => {
    expect(classifyLead(undefined, undefined)).toBe("candidate");
  });

  it("ignores businesses that already have websites", () => {
    expect(classifyLead("https://example.com", "+62 812 0000")).toBe("ignored");
  });

  it("normalizes common OSM contact tags", () => {
    const tags = {
      "contact:phone": "+62 22 123",
      "contact:website": "https://clinic.example",
      amenity: "dentist",
      "addr:street": "Jl. Merdeka",
      "addr:housenumber": "10",
      "addr:city": "Bandung"
    };

    expect(normalizePhone(tags)).toBe("+62 22 123");
    expect(normalizeWebsite(tags)).toBe("https://clinic.example");
    expect(businessType(tags)).toBe("dentist");
    expect(normalizeAddress(tags)).toBe("Jl. Merdeka, 10, Bandung");
  });
});
