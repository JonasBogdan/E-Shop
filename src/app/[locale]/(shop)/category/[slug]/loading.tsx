import { ProductGridSkeleton } from "@/components/products/product-card-skeleton";

export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 h-4 w-40 animate-pulse rounded bg-muted" />

      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Filter sidebar skeleton */}
        <aside className="w-full lg:w-56 lg:shrink-0">
          <div className="rounded-xl border border-border/60 p-4">
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-9 flex-1 animate-pulse rounded bg-muted" />
                <div className="h-9 flex-1 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-9 w-full animate-pulse rounded bg-muted" />
              <div className="h-5 w-28 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </aside>

        {/* Grid area */}
        <div className="flex-1 min-w-0">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 w-20 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </div>
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}
