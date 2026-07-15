import {
  getOrderStepIndex,
  isTerminalFailure,
  ORDER_STEPS,
  orderStatusLabel,
} from "@/lib/order-status";

type Props = {
  status: string;
};

export function OrderStatusStepper({ status }: Props) {
  if (isTerminalFailure(status)) {
    return (
      <div className="border border-error/40 bg-surface-container-low px-4 py-3 font-meta text-xs uppercase text-error">
        {orderStatusLabel(status)}
      </div>
    );
  }

  const active = getOrderStepIndex(status);
  const doneAll = status === "delivered";

  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {ORDER_STEPS.map((step, i) => {
        const done = doneAll || (active >= 0 && i < active);
        const current = !doneAll && i === active;
        return (
          <li
            key={step.key}
            className={`border px-3 py-3 font-meta text-[10px] uppercase tracking-widest ${
              current
                ? "border-primary bg-primary text-on-primary"
                : done
                  ? "border-primary/40 text-primary"
                  : "border-outline-variant/30 text-secondary"
            }`}
          >
            <span className="block text-[9px] opacity-70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="mt-1 block">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
