import { clsx } from "clsx";

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded px-2 text-xs font-semibold uppercase tracking-normal",
        status === "ready" && "bg-emerald-100 text-emerald-800",
        status === "candidate" && "bg-amber-100 text-amber-800",
        status === "ignored" && "bg-slate-200 text-slate-700"
      )}
    >
      {status}
    </span>
  );
}
