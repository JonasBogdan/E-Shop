"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Heart } from "lucide-react";

type Props = {
  productId: string;
  isFavorited: boolean;
};

export function FavoriteButton({ productId, isFavorited: initialFavorited }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    // Optimistically update
    setFavorited((prev) => !prev);

    const res = await fetch(`/api/favorites/${productId}`, { method: "POST" });

    if (!res.ok) {
      // Revert on error
      setFavorited((prev) => !prev);
      // If unauthorized, redirect to login
      if (res.status === 401) {
        router.push("/login");
      }
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 shadow backdrop-blur-sm transition-colors hover:bg-background"
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${
          favorited ? "fill-red-500 text-red-500" : "text-muted-foreground"
        }`}
      />
    </button>
  );
}
