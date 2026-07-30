import { ProductCard } from "./product-card";

type Product = {
  id: string;
  slug: string;
  name_en: string;
  name_lt: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  images: string[];
  weight: string | null;
  is_featured: boolean;
};

export function ProductGrid({
  products,
  favoriteIds = new Set(),
}: {
  products: Product[];
  favoriteIds?: Set<string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorited={favoriteIds.has(product.id)}
        />
      ))}
    </div>
  );
}
