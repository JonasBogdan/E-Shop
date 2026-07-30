"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

type Props = {
  images: string[];
  alt: string;
};

export function ProductImageGallery({ images, alt }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex] ?? null;

  return (
    <div>
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {selectedImage ? (
          <Image
            src={selectedImage}
            alt={alt}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="h-24 w-24 opacity-20" />
          </div>
        )}
      </div>

      {/* Thumbnail strip — only shown when there are multiple images */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={[
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                i === selectedIndex
                  ? "border-primary"
                  : "border-transparent hover:border-muted-foreground/50",
              ].join(" ")}
            >
              <Image
                src={img}
                alt={`${alt} ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
