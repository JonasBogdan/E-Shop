import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PawPrint } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <PawPrint className="mb-6 h-16 w-16 text-muted-foreground/25" />

      <h1 className="text-8xl font-bold tracking-tight text-muted-foreground/20">
        404
      </h1>

      <h2 className="mt-4 text-2xl font-bold">Page not found</h2>

      <p className="mt-2 max-w-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
        <Link href="/category/dog-food">
          <Button variant="outline">Browse Products</Button>
        </Link>
      </div>

    </div>
  );
}
