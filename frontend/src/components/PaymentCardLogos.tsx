const CARDS = [
  { id: "advantage", label: "Advantage", tone: "#1a3a5c" },
  { id: "axess", label: "Axess", tone: "#7a1f2b" },
  { id: "bankkart", label: "Bankkart", tone: "#0d5c4d" },
  { id: "bonus", label: "Bonus", tone: "#c45c26" },
  { id: "cardfinans", label: "CardFinans", tone: "#1e4d8c" },
  { id: "maximum", label: "Maximum", tone: "#5c2d91" },
  { id: "paraf", label: "Paraf", tone: "#b8860b" },
  { id: "world", label: "World", tone: "#2f5d3a" },
  { id: "visa", label: "Visa", tone: "#1a1f71" },
  { id: "mastercard", label: "Mastercard", tone: "#eb001b" },
  { id: "troy", label: "TROY", tone: "#00a3e0" },
] as const;

export function PaymentCardLogos() {
  return (
    <div className="border-t border-outline-variant/15">
      <div className="page-shell py-8 md:py-10">
        <p className="mb-5 font-meta text-[10px] uppercase tracking-[0.2em] text-primary/60">
          Güvenli ödeme · Desteklenen kartlar
        </p>
        <ul className="flex flex-wrap items-center gap-2.5 md:gap-3" aria-label="Kabul edilen kartlar">
          {CARDS.map((card) => (
            <li key={card.id}>
              <span
                className="inline-flex h-10 min-w-21 items-center justify-center gap-2 border border-outline-variant/30 bg-surface-container-low px-3"
                title={card.label}
                aria-label={card.label}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: card.tone }}
                  aria-hidden
                />
                <span className="font-meta text-[9px] uppercase tracking-widest text-secondary">
                  {card.label}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-meta text-[9px] uppercase tracking-wider text-secondary/70">
          PayTR altyapısı · 3D Secure · Advantage, Axess, Bankkart, Bonus,
          CardFinans, Maximum, Paraf, World ve diğer banka kartları
        </p>
      </div>
    </div>
  );
}
