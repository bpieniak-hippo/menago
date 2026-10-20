import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Dashboard jest z natury dynamiczny (dane z bazy per-request, searchParams),
  // więc wyłączamy eksperymentalne Cache Components zamiast owijać każdą
  // stronę w Suspense.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
