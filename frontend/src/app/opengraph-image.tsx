import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 64,
          background: "linear-gradient(145deg, #0e0e0e 0%, #2a2a2a 55%, #611200 100%)",
          color: "#e5e2e1",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#ffb4a2", textTransform: "uppercase" }}>
          Torbalı · İzmir
        </div>
        <div style={{ fontSize: 72, lineHeight: 1.05, marginTop: 16, fontWeight: 700 }}>
          Kılıç Coffee Roasters
        </div>
        <div style={{ fontSize: 28, marginTop: 20, color: "#dec0b9", maxWidth: 800 }}>
          Engineered Precision. Artisanal Depth.
        </div>
      </div>
    ),
    size,
  );
}
