import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} – Dòng Chảy Hoài Niệm`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <a className="skip-link" href="#main-content">Bỏ qua điều hướng, đến nội dung chính</a>
        {children}
      </body>
    </html>
  );
}
