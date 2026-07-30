"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const SLIDES = [
  { src: "/images/hero-1.jpg", alt: "Golden retriever puppy" },
  { src: "/images/hero-2.jpg", alt: "Yellow labrador portrait" },
  { src: "/images/hero-3.jpg", alt: "Orange tabby cat" },
  { src: "/images/hero-4.jpg", alt: "Happy husky dog" },
];

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl shadow-primary/15">
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover"
            priority={i === 0}
            sizes="(max-width: 1024px) 0vw, 50vw"
          />
        </div>
      ))}

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>

      {/* Subtle border */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/5" />
    </div>
  );
}
