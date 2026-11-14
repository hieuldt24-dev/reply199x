import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getAuthView } from "@/lib/supabase/session";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthView();
  return <><Navbar auth={auth} />{children}<Footer /></>;
}
