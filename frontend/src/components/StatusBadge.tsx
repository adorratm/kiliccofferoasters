import { orderStatusLabel, shipmentStatusLabel } from "@/lib/order-status";

type Props = {
  status: string;
  kind?: "order" | "shipment";
};

export function StatusBadge({ status, kind = "order" }: Props) {
  const label =
    kind === "shipment"
      ? shipmentStatusLabel(status)
      : orderStatusLabel(status);

  const tone =
    status === "delivered"
      ? "border-primary/50 text-primary"
      : status === "cancelled" || status === "refunded" || status === "failed"
        ? "border-error/50 text-error"
        : status === "pending_payment"
          ? "border-outline-variant/50 text-secondary"
          : "border-primary/30 text-on-surface";

  return (
    <span
      className={`inline-block border px-2 py-1 font-meta text-[10px] uppercase tracking-widest ${tone}`}
    >
      {label}
    </span>
  );
}
