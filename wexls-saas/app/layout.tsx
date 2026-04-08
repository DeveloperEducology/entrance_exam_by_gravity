import type { Metadata } from "next";
import { Outfit, Baloo_2 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const baloo2 = Baloo_2({
  variable: "--font-baloo-2",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Adaptive Learning SaaS - Personalised Student Education",
  description: "A premium, multi-tenant Adaptive Learning Platform (SaaS) that personalises student education and provides deep pedagogical insights to teachers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${baloo2.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
