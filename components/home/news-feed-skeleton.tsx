const PLACEHOLDER_COUNT = 6;

export function NewsFeedSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading stories…</span>
      <ul aria-hidden="true" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
          <li key={index} className="min-w-0">
            <div className="flex h-full flex-col rounded-lg border border-line bg-panel p-3">
              <div className="aspect-[16/10] rounded-lg bg-panel-muted" />
              <div className="mt-3 h-3 w-1/3 rounded-full bg-panel-muted" />
              <div className="mt-2 h-4 w-5/6 rounded-full bg-panel-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
