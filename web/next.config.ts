import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        has: [
          {
            type: "query",
            key: "date",
            value: "(?<date>\\d{4}-\\d{2}-\\d{2})",
          },
        ],
        destination: "/issues/:date",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
