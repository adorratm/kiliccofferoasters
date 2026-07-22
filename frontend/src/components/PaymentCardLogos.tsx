const CARDS = [
  { id: "advantage", label: "Advantage", src: "/images/payment-cards/advantage.svg" },
  { id: "axess", label: "Axess", src: "/images/payment-cards/axess.svg" },
  { id: "bankkart", label: "Bankkart", src: "/images/payment-cards/bankkart.svg" },
  { id: "bonus", label: "Bonus", src: "/images/payment-cards/bonus.svg" },
  { id: "cardfinans", label: "CardFinans", src: "/images/payment-cards/cardfinans.svg" },
  { id: "maximum", label: "Maximum", src: "/images/payment-cards/maximum.svg" },
  { id: "paraf", label: "Paraf", src: "/images/payment-cards/paraf.svg" },
  { id: "world", label: "World", src: "/images/payment-cards/world.svg" },
  { id: "visa", label: "Visa", src: "/images/payment-cards/visa.svg" },
  { id: "mastercard", label: "Mastercard", src: "/images/payment-cards/mastercard.svg" },
  { id: "troy", label: "TROY", src: "/images/payment-cards/troy.svg" },
] as const;

export function PaymentCardLogos() {
  return (
    <div className="border-t border-outline-variant/15">
      <div className="page-shell py-8 md:py-10">
        <p className="mb-5 font-meta text-[10px] uppercase tracking-[0.2em] text-primary/60">
          Güvenli ödeme · Desteklenen kartlar
        </p>
        <ul
          className="flex flex-wrap items-center gap-3 md:gap-4"
          aria-label="Kabul edilen kartlar"
        >
          {CARDS.map((card) => (
            <li key={card.id}>
              <span
                className="inline-flex items-center gap-2.5 border border-outline-variant/25 bg-surface-container-low py-1.5 pl-1.5 pr-3"
                title={card.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.src}
                  alt={`${card.label} logosu`}
                  width={56}
                  height={36}
                  className="h-8 w-12.5 shrink-0 object-contain bg-white sm:h-9 sm:w-14"
                  loading="lazy"
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
