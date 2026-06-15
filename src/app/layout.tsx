import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

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
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-10 px-8 py-5">
            <Link href="/" className="text-2xl font-bold tracking-tight text-indigo-600">
              CardCycle
            </Link>
            <nav className="flex items-center gap-8 text-sm font-medium">
              <Link href="/" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Dashboard
              </Link>
              <Link href="/cards" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Cards
              </Link>
              <Link href="/transactions" className="text-slate-600 hover:text-indigo-600 transition-colors">
                Transactions
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto max-w-7xl w-full px-8 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
