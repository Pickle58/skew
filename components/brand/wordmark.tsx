type WordmarkProps = {
  tone?: "default" | "inverse";
  size?: "brand" | "footer";
};

export function Wordmark({ tone = "default", size = "brand" }: WordmarkProps) {
  const name = tone === "inverse" ? "text-white" : "text-ink";
  const news = tone === "inverse" ? "text-footer-muted" : "text-muted";
  const nameSize = size === "brand" ? "text-[40px]" : "text-[22px]";
  const newsSize = size === "brand" ? "mb-[7px] text-sm" : "mb-[3px] text-[11px]";

  return (
    <span className="inline-flex items-end gap-1.5">
      <span className={`${nameSize} font-extrabold leading-none tracking-[-0.03em] ${name}`}>
        Skew
      </span>
      <span className={`${newsSize} font-medium leading-none ${news}`}>News</span>
    </span>
  );
}
