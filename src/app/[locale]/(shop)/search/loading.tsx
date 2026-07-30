import { ProductGridSkeleton } from "@/components/products/product-card-skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-muted" />

      {/* Search bar skeleton */}
      <div className="mb-8 h-10 max-w-md animate-pulse rounded-md bg-muted" />

      {/* Results count skeleton */}
      <div className="mb-6 h-7 w-40 animate-pulse rounded bg-muted" />

      <ProductGridSkeleton count={8} />
    </div>
  );
}
