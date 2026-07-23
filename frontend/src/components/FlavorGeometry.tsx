type Props = {
  values?: Record<string, number> | null;
};

const AXES = ["acidity", "sweetness", "body", "floral", "fruit", "clarity"] as const;

const LABELS: Record<(typeof AXES)[number], string> = {
  acidity: "Acidity",
  sweetness: "Sweetness",
  body: "Body",
  floral: "Floral",
  fruit: "Fruit",
  clarity: "Clarity",
};

function point(cx: number, cy: number, r: number, index: number, total: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function hasGeometryValues(values?: Record<string, number> | null) {
  if (!values) return false;
  return AXES.some((key) => {
    const raw = values[key] ?? values[LABELS[key].toLowerCase()];
    return raw != null && !Number.isNaN(Number(raw));
  });
}

export function FlavorGeometry({ values }: Props) {
  if (!hasGeometryValues(values)) return null;

  const cx = 100;
  const cy = 100;
  const maxR = 70;
  const normalized = AXES.map((key) => {
    const raw = values?.[key] ?? values?.[LABELS[key].toLowerCase()] ?? 0;
    return Math.min(1, Math.max(0, Number(raw) > 1 ? Number(raw) / 10 : Number(raw)));
  });

  const poly = normalized
    .map((v, i) => {
      const p = point(cx, cy, maxR * Math.max(v, 0.05), i, AXES.length);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  const outer = AXES.map((_, i) => {
    const p = point(cx, cy, maxR, i, AXES.length);
    return `${p.x},${p.y}`;
  }).join(" ");

  const mid = AXES.map((_, i) => {
    const p = point(cx, cy, maxR * 0.55, i, AXES.length);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <div className="industrial-border relative p-6">
      <div className="absolute -top-3 left-4 bg-surface px-2 font-meta text-[10px] uppercase text-on-surface-variant">
        Flavor Geometry
      </div>
      <div className="flex items-center justify-center py-4">
        <svg width="220" height="220" viewBox="0 0 200 200" className="overflow-visible">
          <polygon points={outer} fill="none" stroke="rgba(229,226,225,0.12)" />
          <polygon points={mid} fill="none" stroke="rgba(229,226,225,0.12)" />
          {AXES.map((_, i) => {
            const p = point(cx, cy, maxR, i, AXES.length);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke="rgba(229,226,225,0.12)"
              />
            );
          })}
          <polygon
            points={poly}
            fill="rgba(255,180,162,0.2)"
            stroke="#ffb4a2"
            strokeWidth="2"
          />
          {AXES.map((key, i) => {
            const p = point(cx, cy, maxR + 18, i, AXES.length);
            return (
              <text
                key={key}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-on-surface-variant font-meta"
                style={{ fontSize: 8 }}
              >
                {LABELS[key].toUpperCase()}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
