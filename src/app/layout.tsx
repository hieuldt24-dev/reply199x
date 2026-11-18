import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";
import "@/styles/globals.css";

/** Only the ticket order dialog uses this face (italic title accent); the rest of the site keeps its existing fonts. */
const playfairDisplay = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  style: "italic",
  weight: "700",
  display: "swap",
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} – Dòng Chảy Hoài Niệm`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className={playfairDisplay.variable}>
      <body className="antialiased">
        <a className="skip-link" href="#main-content">Bỏ qua điều hướng, đến nội dung chính</a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
