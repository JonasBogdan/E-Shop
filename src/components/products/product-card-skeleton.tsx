export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      {/* Image */}
      <div className="aspect-square animate-pulse bg-muted" />
      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-5 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-auto pt-3">
          <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
