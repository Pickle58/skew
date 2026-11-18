export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-[1280px] px-6 pt-3">
      <span className="sr-only">Loading story…</span>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="h-9 w-full rounded-lg bg-panel-muted" />
        <div className="h-8 w-2/3 rounded-lg bg-panel-muted" />
        <div className="h-[360px] w-full rounded-lg bg-panel-muted" />
      </div>
    </div>
  );
}
