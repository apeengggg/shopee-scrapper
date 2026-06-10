import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  appConfig: {
    credentialEncryptionKey: Buffer.alloc(32, 7).toString("base64")
  }
}));

describe("credential encryption", () => {
  it("round-trips encrypted secrets", async () => {
    const { decryptSecret, encryptSecret } = await import("@/lib/credentials");
    const encrypted = encryptSecret("sk-test-secret");

    expect(encrypted.secretCiphertext).not.toContain("sk-test-secret");
    expect(decryptSecret(encrypted)).toBe("sk-test-secret");
  });
});
