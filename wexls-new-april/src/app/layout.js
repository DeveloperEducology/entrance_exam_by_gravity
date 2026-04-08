import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700"],
  display: 'swap',
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

export const metadata = {
  title: "Adaptive Learning System | Personalized Math & Literacy",
  description: "A proprietary AI-driven platform for mastery-based learning in math and literacy.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className={inter.className}>
        <main>{children}</main>
      </body>
    </html>
  );
}
