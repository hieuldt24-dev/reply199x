import { createClient } from "./server";

export type AuthView =
  | { status: "authenticated"; displayName: string }
  | { status: "anonymous" }
  | { status: "unavailable" };

export async function getAuthView(): Promise<AuthView> {
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    if (error) return { status: "anonymous" };
    if (!data.user) return { status: "anonymous" };
    const metadataName = data.user.user_metadata?.full_name;
    const displayName = typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim().slice(0, 40)
      : "Bạn";
    return { status: "authenticated", displayName };
  } catch {
    return { status: "unavailable" };
  }
}
