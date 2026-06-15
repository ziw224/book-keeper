import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CardCycle",
  description: "Track spending by credit card statement cycles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-[family-name:var(--font-inter)]">
        <NavBar />
        <main className="flex-1 mx-auto max-w-7xl w-full px-8 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
