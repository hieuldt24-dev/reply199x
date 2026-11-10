import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <><Navbar />{children}<Footer /></>;
}
