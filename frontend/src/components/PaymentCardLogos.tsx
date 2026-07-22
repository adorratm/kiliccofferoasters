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
      <div className="page-shell py-5 md:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <ul
            className="flex flex-wrap items-center gap-1.5"
            aria-label="Kabul edilen kartlar"
          >
            {CARDS.map((card) => (
              <li key={card.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.src}
                  alt={card.label}
                  title={card.label}
                  width={40}
                  height={26}
                  className="h-5.5 w-8.5 object-contain bg-white sm:h-6 sm:w-10"
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
          <p className="shrink-0 text-right font-meta text-[9px] uppercase tracking-wider text-secondary/70 sm:pb-0.5">
            Developed By{" "}
            <a
              href="https://emrekilic.web.tr"
              target="_blank"
              rel="noopener noreferrer"
              className="normal-case tracking-normal text-secondary underline decoration-outline-variant/40 underline-offset-2 hover:text-primary"
            >
              https://emrekilic.web.tr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
