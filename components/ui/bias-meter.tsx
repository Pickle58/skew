type BiasMeterProps = {
  left: number;
  center: number;
  right: number;
  showScale?: boolean;
  size?: "meter" | "card";
  labels?: "full" | "compact";
  widths?: "flex" | "exact";
};

export function BiasMeter({
  left,
  center,
  right,
  showScale = false,
  size = "meter",
  labels = "full",
  widths = "flex",
}: BiasMeterProps) {
  const height = size === "meter" ? "h-8" : labels === "compact" ? "h-[22px]" : "h-6";
  const label = size === "meter" ? "text-[12px]" : "text-[10px]";
  const segments = [
    {
      key: "left",
      value: left,
      name: labels === "compact" ? "L" : "Left",
      className: "bg-bias-left text-white",
    },
    { key: "center", value: center, name: "Center", className: "bg-bias-center text-ink" },
    { key: "right", value: right, name: "Right", className: "bg-bias-right text-white" },
  ] as const;

  return (
    <div>
      <div
        className={`flex overflow-hidden rounded-full ${height} ${label} font-medium`}
        role="img"
        aria-label={`Left ${left} percent, center ${center} percent, right ${right} percent`}
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={`flex items-center justify-center whitespace-nowrap px-1 ${segment.className} ${
              labels === "compact" || widths === "exact" ? "min-w-0 overflow-hidden" : ""
            }`}
            style={
              labels === "compact" || widths === "exact"
                ? { width: `${segment.value}%` }
                : { flex: `${segment.value} 1 auto` }
            }
          >
            {segment.name} {segment.value}%
          </div>
        ))}
      </div>
      {showScale ? (
        <div className="mt-1.5 flex justify-between text-[11px] leading-[1.4] text-muted">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      ) : null}
    </div>
  );
}
