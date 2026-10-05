interface LoadingSkeletonProps {
  label?: string;
  cards?: number;
}

export function LoadingSkeleton({ label = 'Đang tải dữ liệu...', cards = 3 }: LoadingSkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-4">
      <p className="text-sm text-ink-medium">{label}</p>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="min-h-48 space-y-4 rounded-lg border border-paper-kraft/70 bg-paper-white p-5">
            <div className="skeleton-block h-4 w-1/3" />
            <div className="skeleton-block h-7 w-2/3" />
            <div className="space-y-2 pt-2">
              <div className="skeleton-block h-3 w-full" />
              <div className="skeleton-block h-3 w-4/5" />
            </div>
            <div className="skeleton-block h-8 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
