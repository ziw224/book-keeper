'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, User, WalletCards, Settings, LogOut, ChevronRight, CreditCard, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
];

interface Card {
  id: string;
  name: string;
  issuer: string;
  last4: string;
  type: string;
  statementCloseDay: number | null;
}

export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false); }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menuOpen]);

  function openProfile() {
    setMenuOpen(false);
    setProfileOpen(true);
    fetch('/api/cards').then(r => r.json()).then(setCards).catch(() => {});
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center px-8 py-5">
          <Link href="/" className="mr-12 text-2xl font-bold tracking-tight text-indigo-600">
            CardCycle
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    active ? 'text-indigo-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[21px] h-0.5 rounded-full bg-indigo-600" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/cards"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Add Card
            </Link>

            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="User menu"
                aria-expanded={menuOpen}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md"
              >
                <User className="h-5 w-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-4">
                    <p className="text-sm font-bold text-slate-950">CardCycle User</p>
                    <p className="mt-1 text-xs text-slate-500">Personal workspace</p>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={openProfile}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-3">
                        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><WalletCards className="h-4 w-4" /></span>
                        <span>
                          <span className="block font-bold text-slate-900">Profile</span>
                          <span className="block text-xs text-slate-500">View all card information</span>
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>

                    <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-slate-50">
                      <span className="rounded-lg bg-slate-100 p-2 text-slate-600"><Settings className="h-4 w-4" /></span>
                      <span>
                        <span className="block font-bold text-slate-900">Settings</span>
                        <span className="block text-xs text-slate-500">Placeholder for now</span>
                      </span>
                    </button>

                    <div className="my-2 border-t border-slate-100" />

                    <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-rose-50">
                      <span className="rounded-lg bg-rose-50 p-2 text-rose-600"><LogOut className="h-4 w-4" /></span>
                      <span>
                        <span className="block font-bold text-rose-600">Exit</span>
                        <span className="block text-xs text-slate-500">No auth behavior yet</span>
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Profile drawer */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" onClick={() => setProfileOpen(false)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">Profile</h2>
                <p className="mt-1 text-sm text-slate-500">All saved card information</p>
              </div>
              <button onClick={() => setProfileOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                  U
                </div>
                <div>
                  <p className="font-bold text-slate-950">CardCycle User</p>
                  <p className="text-sm text-slate-500">Local-only profile</p>
                </div>
              </div>
            </div>

            <h3 className="mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">Cards ({cards.length})</h3>

            <div className="mt-3 space-y-3">
              {cards.map(card => (
                <div key={card.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">{card.name}</p>
                      <p className="text-sm text-slate-500">{card.issuer} •••• {card.last4}</p>
                    </div>
                    <span className={`ml-auto rounded px-2 py-0.5 text-[10px] font-bold uppercase ${card.type === 'debit' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {card.type}
                    </span>
                  </div>
                  {card.type === 'credit' && card.statementCloseDay != null && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">Statement close day</p>
                      <p className="mt-1 font-bold text-slate-950">{card.statementCloseDay}</p>
                    </div>
                  )}
                </div>
              ))}
              {cards.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">No cards yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
