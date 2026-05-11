/**
 * Tiny inline SVG icons per lesson topic. Keeps everything in-bundle, no
 * external icon library, no CDN. Each lesson gets a glyph that hints at the
 * topic.
 */

const ICONS: Record<string, string> = {
  "anatomy-of-a-prompt":
    "M4 6h16M4 12h12M4 18h8",
  "specificity-beats-verbosity":
    "M12 2v6m0 0l-4-4m4 4l4-4M5 12h14M7 22h10",
  "roles-and-personas":
    "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  "few-shot":
    "M4 6h16M4 12h16M4 18h16",
  "output-format":
    "M8 4l-4 4 4 4M16 4l4 4-4 4M12 20l-1 -16",
  "chain-of-thought":
    "M3 12h4l3-9 4 18 3-9h4",
  "tool-use":
    "M14 6l-8 8a2.83 2.83 0 1 0 4 4l8-8M14 6l3-3 4 4-3 3M14 6l4 4",
  "llm-as-judge":
    "M12 3v18M5 8l7 -5 7 5M5 8v8l7 4 7 -4V8",
  "prompt-injection-defense":
    "M12 2l9 4v6c0 5-3.5 9-9 10-5.5-1-9-5-9-10V6z",
  "self-consistency":
    "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5",
  "iterative-refinement":
    "M3 12a9 9 0 0 1 17.5-3M21 12a9 9 0 0 1-17.5 3M21 4v5h-5M3 20v-5h5",
  "production-prompts":
    "M5 7h14M5 12h14M5 17h14M3 7l2-3h14l2 3",
};

export function LessonIcon({ id, className = "" }: { id: string; className?: string }) {
  const d = ICONS[id] ?? "M4 12l4 4 12-12";
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}
