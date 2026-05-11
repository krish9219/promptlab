import Link from "next/link";

/**
 * Unified brand mark. Used in the lobby hero, sidebar, footer, and anywhere
 * the brand needs to appear consistently.
 *
 * Variants:
 *   "hero"   — large wordmark + tag (used on the homepage hero)
 *   "compact"— small wordmark, single line (sidebar, in-page header)
 *   "footer" — minimal, single-line, subdued
 */

type Variant = "hero" | "compact" | "footer";

export function Brand({
  variant = "compact",
  asLink = true,
}: {
  variant?: Variant;
  asLink?: boolean;
}) {
  if (variant === "hero") {
    return (
      <div className="flex items-baseline gap-3">
        <Inner large />
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[color:var(--line)] bg-[color:var(--panel-2)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[color:var(--mute)]">
          <span className="h-1 w-1 rounded-full bg-[color:var(--accent)]" />
          from Aravind Labs
        </span>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <span className="text-xs text-[color:var(--mute)]">
        <span className="font-semibold text-[color:var(--text-2)]">prompt<span className="text-[color:var(--accent)]">lab</span></span>
        <span className="mx-1.5">·</span>
        <span>from <span className="font-medium text-[color:var(--text-2)]">Aravind Labs</span></span>
      </span>
    );
  }

  // compact (default)
  const content = (
    <span className="flex flex-col leading-tight">
      <Inner />
      <span className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--mute)]">
        from Aravind Labs
      </span>
    </span>
  );
  return asLink ? <Link href="/" className="block">{content}</Link> : content;
}

function Inner({ large = false }: { large?: boolean }) {
  return (
    <span
      className={
        large
          ? "text-3xl font-extrabold tracking-tight"
          : "text-lg font-bold tracking-tight"
      }
    >
      prompt<span className="text-[color:var(--accent)]">lab</span>
    </span>
  );
}
