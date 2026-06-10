import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/lib/env";

const algorithm = "aes-256-gcm";

export function encryptSecret(secret: string) {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    secretCiphertext: ciphertext.toString("base64"),
    secretIv: iv.toString("base64"),
    secretTag: tag.toString("base64")
  };
}

export function decryptSecret(record: {
  secretCiphertext: string;
  secretIv: string;
  secretTag: string;
}) {
  const key = encryptionKey();
  const decipher = createDecipheriv(
    algorithm,
    key,
    Buffer.from(record.secretIv, "base64")
  );
  decipher.setAuthTag(Buffer.from(record.secretTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(record.secretCiphertext, "base64")),
    decipher.final()
  ]);
  return plaintext.toString("utf8");
}

export async function getOpenAiApiKey() {
  const credential = await prisma.integrationCredential.findUnique({
    where: { provider: "openai" }
  });
  if (!credential?.active) return null;
  return decryptSecret(credential);
}

function encryptionKey() {
  const value = appConfig.credentialEncryptionKey;
  if (!value) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY is required to store API keys");
  }
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be 32 bytes encoded as base64");
  }
  return key;
}
