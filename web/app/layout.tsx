import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "GETPAID", template: "%s | GETPAID" },
  description: "Educational fintech simulation platform. Learn how wallet systems, tasks, referrals, and rewards are built.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
