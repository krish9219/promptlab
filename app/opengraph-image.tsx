import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "promptlab — learn prompt engineering by getting graded";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(ellipse at 30% 0%, rgba(139, 92, 246, 0.35) 0%, transparent 55%), #0a0a0a",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "#ededed",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 28, fontWeight: 600 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#8b5cf6",
            }}
          />
          <span>promptlab</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            Learn prompt engineering by{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6366f1 50%, #06b6d4)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              getting graded.
            </span>
          </div>
          <div style={{ fontSize: 28, color: "#a3a3a3", maxWidth: 900 }}>
            12 lessons · beginner → expert · live LLM scoring · MIT
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#737373",
            borderTop: "1px solid #262626",
            paddingTop: 24,
          }}
        >
          <span>github.com/krish9219/promptlab</span>
          <span>★ Open-source</span>
        </div>
      </div>
    ),
    size,
  );
}
