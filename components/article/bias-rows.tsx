type BiasRow = {
  label: string;
  percent: number;
  fillClassName: string;
};

type BiasRowsProps = {
  rows: BiasRow[];
};

export function BiasRows({ rows }: BiasRowsProps) {
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between text-[13px] leading-[1.4]">
            <span className="text-ink">{row.label}</span>
            <span className="text-muted">{row.percent}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel-muted">
            <div
              className={`h-full rounded-full border border-ink/10 ${row.fillClassName}`}
              style={{ width: `${row.percent}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
