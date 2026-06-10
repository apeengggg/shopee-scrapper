import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(serialize(data), init);
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return json(
      { error: "Invalid request", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  return json(
    { error: error instanceof Error ? error.message : "Unexpected error" },
    { status: 500 }
  );
}

function serialize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, serialize(nested)])
    );
  }
  return value;
}
