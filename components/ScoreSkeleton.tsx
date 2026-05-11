export function ScoreSkeleton({ rubricCount }: { rubricCount: number }) {
  return (
    <div className="mt-5 card p-4 animate-fade-in" aria-live="polite" aria-busy="true">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 skeleton rounded" />
        <div className="h-9 w-20 skeleton rounded" />
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: rubricCount }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-2)] p-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-36 skeleton rounded" />
              <div className="h-3 w-16 skeleton rounded" />
            </div>
            <div className="mt-2 h-3 w-full skeleton rounded" />
            <div className="mt-1 h-3 w-3/4 skeleton rounded" />
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="h-3 w-full skeleton rounded" />
        <div className="h-3 w-5/6 skeleton rounded" />
      </div>
    </div>
  );
}
