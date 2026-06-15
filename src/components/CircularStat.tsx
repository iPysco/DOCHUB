interface Props {
  label: string;
  value: number;
  total: number;
  tone: "pending" | "overdue" | "received" | "validated";
}

const toneColor: Record<Props["tone"], string> = {
  pending: "var(--color-pending)",
  overdue: "var(--color-overdue)",
  received: "var(--color-received)",
  validated: "var(--color-validated)",
};

const toneBg: Record<Props["tone"], string> = {
  pending: "var(--color-pending-soft)",
  overdue: "var(--color-overdue-soft)",
  received: "var(--color-received-soft)",
  validated: "var(--color-validated-soft)",
};

export function CircularStat({ label, value, total, tone }: Props) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = toneColor[tone];
  const bg = toneBg[tone];

  return (
    <div
      className="border border-border rounded-xl p-6 flex flex-col items-center gap-3"
      style={{ backgroundColor: bg }}
    >
      <div className="relative size-32">
        <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold" style={{ color }}>
            {pct}%
          </div>
          <div className="text-xs text-foreground/70">
            {value}/{total}
          </div>
        </div>
      </div>
      <div className="text-sm font-medium text-foreground">{label}</div>
    </div>
  );
}
