export const GRIND_OPTIONS = [
  'whole_bean',
  'filter',
  'espresso',
  'turkish',
] as const;

export type GrindOption = (typeof GRIND_OPTIONS)[number];

export const GRIND_LABELS: Record<GrindOption, string> = {
  whole_bean: 'Çekirdek',
  filter: 'Filtre',
  espresso: 'Espresso',
  turkish: 'Türk kahvesi',
};

export function isGrindOption(value: unknown): value is GrindOption {
  return (
    typeof value === 'string' &&
    (GRIND_OPTIONS as readonly string[]).includes(value)
  );
}
