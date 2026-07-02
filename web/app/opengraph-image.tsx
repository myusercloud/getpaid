import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "GETPAID — Complete tasks. Start earning.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoData = readFileSync(join(process.cwd(), "public", "logo-hero.png"));
const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          padding: "72px 80px",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Right-side accent blobs */}
        <div
          style={{
            position: "absolute",
            right: -60,
            top: "50%",
            transform: "translateY(-50%)",
            width: 420,
            height: 420,
            borderRadius: "50%",
            backgroundColor: "#e0f2fe",
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 80,
            bottom: 60,
            width: 160,
            height: 160,
            borderRadius: "50%",
            backgroundColor: "#d1fae5",
            opacity: 0.7,
          }}
        />

        {/* Logo lockup */}
        <img
          src={logoSrc}
          width={280}
          height={112}
          style={{ objectFit: "contain", marginBottom: 40 }}
        />

        {/* Headline — display:flex required by satori when mixing text + span */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 62,
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            marginBottom: 20,
            maxWidth: 720,
          }}
        >
          <span>Complete tasks.&nbsp;</span>
          <span style={{ color: "#0ea5e9" }}>Start earning.</span>
        </div>

        {/* Value prop */}
        <div
          style={{
            fontSize: 26,
            color: "#475569",
            fontWeight: 400,
            letterSpacing: "-0.01em",
          }}
        >
          Watch videos · Refer friends · Earn KES rewards
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: 52,
            left: 80,
            fontSize: 18,
            color: "#94a3b8",
            fontFamily: "monospace",
          }}
        >
          getpaid.com
        </div>
      </div>
    ),
    { ...size }
  );
}
