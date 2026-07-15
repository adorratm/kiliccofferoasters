type Event = {
  at: string;
  description: string;
  location?: string;
};

type Props = {
  events: Event[];
};

export function TrackingTimeline({ events }: Props) {
  if (!events.length) {
    return (
      <p className="font-meta text-xs uppercase text-secondary">
        Henüz hareket kaydı yok.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-outline-variant/40 pl-6">
      {events.map((ev, i) => (
        <li key={`${ev.at}-${i}`} className="relative pb-6 last:pb-0">
          <span
            className={`absolute left-[-1.9rem] top-1 h-3 w-3 rounded-full border-2 ${
              i === 0
                ? "border-primary bg-primary"
                : "border-outline-variant bg-surface"
            }`}
            aria-hidden
          />
          <p className="font-meta text-[10px] uppercase tracking-widest text-primary">
            {ev.at
              ? new Date(ev.at).toLocaleString("tr-TR") === "Invalid Date"
                ? ev.at
                : new Date(ev.at).toLocaleString("tr-TR")
              : "—"}
          </p>
          <p className="mt-1 font-meta text-xs uppercase text-on-surface">
            {ev.description}
          </p>
          {ev.location ? (
            <p className="mt-1 font-meta text-[10px] uppercase text-secondary">
              {ev.location}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
