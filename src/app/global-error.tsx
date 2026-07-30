"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center text-foreground">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-extrabold">Something went wrong</h1>
          <p className="mt-3 max-w-sm text-gray-500">
            A critical error occurred. Please refresh the page or try again later.
          </p>
          <button
            onClick={reset}
            className="mt-8 rounded-md bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
