// Shared by the password login route and the dialog form. Pure: no env access, no Buffer.
export const USERNAME_RE = /^[a-z0-9_.]{3,32}$/;
export const PASSWORD_MIN_BYTES = 8;
// Supabase Auth hashes passwords with bcrypt, which only uses the first 72 bytes.
export const PASSWORD_MAX_BYTES = 72;

export type Credentials = { username: string; password: string };

export function parseCredentials(body: unknown): Credentials | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { username, password } = body as Record<string, unknown>;
  if (typeof username !== "string" || typeof password !== "string") return null;
  const normalized = username.trim().toLowerCase();
  if (!USERNAME_RE.test(normalized)) return null;
  const bytes = new TextEncoder().encode(password).length;
  if (bytes < PASSWORD_MIN_BYTES || bytes > PASSWORD_MAX_BYTES) return null;
  return { username: normalized, password };
}
