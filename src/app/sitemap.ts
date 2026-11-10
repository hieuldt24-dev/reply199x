import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", process.env.SITE_URL || "http://localhost:3000").href }];
}
