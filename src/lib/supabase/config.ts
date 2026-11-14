export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Invalid Supabase project URL.");
  }
  return { url: parsed.origin, key };
}

export function getSiteOrigin() {
  const url = new URL(process.env.SITE_URL || "http://localhost:3000");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("Invalid SITE_URL.");
  }
  return url.origin;
}

// Keep the post-login destination fixed until authenticated order pages exist.
export const AUTH_DESTINATION = "/";
