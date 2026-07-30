import Link from "next/link";
import { PawPrint } from "lucide-react";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            textAlign: "center",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ marginBottom: "1.5rem", opacity: 0.2 }}>
            <PawPrint size={64} />
          </div>

          <h1
            style={{
              fontSize: "6rem",
              fontWeight: 700,
              color: "#d1d5db",
              lineHeight: 1,
              margin: 0,
            }}
          >
            404
          </h1>

          <h2
            style={{
              marginTop: "1rem",
              fontSize: "1.5rem",
              fontWeight: 700,
            }}
          >
            Page not found
          </h2>

          <p style={{ marginTop: "0.5rem", color: "#6b7280" }}>
            The page you&apos;re looking for doesn&apos;t exist.
          </p>

          <Link
            href="/en"
            style={{
              marginTop: "2rem",
              display: "inline-block",
              padding: "0.625rem 1.25rem",
              backgroundColor: "#000",
              color: "#fff",
              borderRadius: "0.375rem",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "0.875rem",
            }}
          >
            Go Home
          </Link>
        </div>
      </body>
    </html>
  );
}
