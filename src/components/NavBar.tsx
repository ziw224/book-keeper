'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/cards', label: 'Cards' },
  { href: '/transactions', label: 'Transactions' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-12 px-8 py-5">
        <Link href="/" className="text-2xl font-bold tracking-tight text-indigo-600">
          CardCycle
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[21px] h-0.5 rounded-full bg-indigo-600 transition-all" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
