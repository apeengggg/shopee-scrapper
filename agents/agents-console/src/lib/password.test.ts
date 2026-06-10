import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies matching passwords and rejects non-matches", () => {
    const hash = hashPassword("ChangeMe123!");

    expect(verifyPassword("ChangeMe123!", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });
});
