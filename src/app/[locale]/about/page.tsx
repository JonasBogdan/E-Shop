import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CONTACT_PHONE, CONTACT_EMAIL, SITE_NAME } from "@/lib/constants";
import { Heart, Shield, Truck, Star } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = {
  title: `About Us | ${SITE_NAME}`,
  description: `Learn about ${SITE_NAME} — our story, values, and commitment to premium pet nutrition.`,
};

const values = [
  {
    icon: <Heart className="h-6 w-6 text-primary" />,
    title: "We Love Pets",
    body: "Every product we stock is chosen because we'd happily feed it to our own dogs and cats. No compromises.",
  },
  {
    icon: <Shield className="h-6 w-6 text-primary" />,
    title: "Quality Guarantee",
    body: "We only carry brands with transparent ingredient lists and proven nutritional standards.",
  },
  {
    icon: <Truck className="h-6 w-6 text-primary" />,
    title: "Fast Delivery",
    body: "Orders dispatched within 1–2 business days. Free delivery on orders over €50 across Lithuania.",
  },
  {
    icon: <Star className="h-6 w-6 text-primary" />,
    title: "Expert Advice",
    body: "Not sure what to feed your pet? Call or email us — we're happy to help you find the right food.",
  },
];

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/6 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Passionate About<br />
                <span className="text-primary">Pet Nutrition</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                {SITE_NAME} started with a simple belief: every dog and cat deserves food made from
                real, quality ingredients. We&apos;re a small team of pet owners who got tired of
                wading through misleading labels and decided to do something about it.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
                <Link href="/category/dog-food">
                  <Button size="lg" className="gap-2 px-8">
                    Shop Now
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="lg" className="px-8">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl shadow-primary/15">
                <Image
                  src="/images/about-hero.jpg"
                  alt="Two happy dogs"
                  fill
                  className="object-cover"
                  priority
                  sizes="50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our story */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight">Our Story</h2>
        <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            We opened {SITE_NAME} in Vilnius after struggling to find premium pet food locally.
            The supermarket shelves were full of products loaded with fillers and artificial
            preservatives, while specialty stores were either too expensive or too hard to reach.
          </p>
          <p>
            So we built the store we wished existed — one that focuses on ingredient quality,
            honest pricing, and fast delivery to your door. Whether you have a puppy, a senior
            cat, or a pet with specific dietary needs, we want to make it easy to feed them well.
          </p>
          <p>
            Today we ship across Lithuania and the EU, and we&apos;re proud to be the first choice
            for thousands of pet owners who care about what goes into their animals&apos; bowls.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 py-16 sm:px-6 lg:px-8" style={{ background: "oklch(0.97 0.008 75)" }}>
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight">Why Choose Us</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">{v.icon}</div>
                <h3 className="font-bold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-4 py-12 text-primary-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold">Have a question?</h2>
          <p className="mt-3 text-primary-foreground/80">
            Call us on {CONTACT_PHONE} or email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            . We reply within a few hours on business days.
          </p>
          <div className="mt-6">
            <Link href="/contact">
              <Button variant="secondary" size="lg" className="font-semibold">
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
