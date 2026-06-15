'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, User, WalletCards, Settings, LogOut, ChevronRight, CreditCard, X, CalendarDays, Trash2, ReceiptText } from 'lucide-react';
import { getPaycheckRules, savePaycheckRules, type PaycheckRule } from '@/lib/importantDates';
import { formatUSD, toCents } from '@/lib/money';
import { listRecentCycles } from '@/lib/cycle';

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

interface StmtBalance {
  id: string;
  cardId: string;
  cycleKey: string;
  statementTotalCents: number;
  manualTotal: number;
  adjustment: number;
  status: string;
  card: { name: string; last4: string };
}

export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [stmtOpen, setStmtOpen] = useState(false);
  const [stmtBalances, setStmtBalances] = useState<StmtBalance[]>([]);
  const [stCard, setStCard] = useState('');
  const [stCycle, setStCycle] = useState('');
  const [stAmount, setStAmount] = useState('');
  const [stCycles, setStCycles] = useState<{ key: string; label: string }[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [paycheckRules, setPaycheckRules] = useState<PaycheckRule[]>([]);
  const [pcLabel, setPcLabel] = useState('Paycheck');
  const [pcFreq, setPcFreq] = useState<'monthly' | 'twice_monthly'>('monthly');
  const [pcDay1, setPcDay1] = useState('15');
  const [pcDay2, setPcDay2] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false); }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menuOpen]);

  async function saveStatement() {
    if (!stCard || !stCycle || !stAmount) return;
    let cents: number;
    try { cents = -Math.abs(toCents(stAmount)); } catch { return; }
    await fetch('/api/statements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: stCard, cycleKey: stCycle, statementTotalCents: cents }),
    });
    setStAmount('');
    fetch('/api/statements').then(r => r.json()).then(setStmtBalances).catch(() => {});
  }

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

            <button
              onClick={() => { setDatesOpen(true); setPaycheckRules(getPaycheckRules()); fetch('/api/cards').then(r => r.json()).then(setCards).catch(() => {}); }}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
            >
              <CalendarDays className="h-4 w-4" />
              Dates
            </button>

            <button
              onClick={() => {
                setStmtOpen(true);
                fetch('/api/cards').then(r => r.json()).then((c: Card[]) => {
                  setCards(c);
                  const credit = c.filter(x => x.type === 'credit');
                  if (credit.length > 0 && !stCard) {
                    setStCard(credit[0].id);
                    if (credit[0].statementCloseDay) setStCycles(listRecentCycles(credit[0].statementCloseDay, 12).map(cy => ({ key: cy.key, label: cy.label })));
                  }
                }).catch(() => {});
                fetch('/api/statements').then(r => r.json()).then(setStmtBalances).catch(() => {});
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
            >
              <ReceiptText className="h-4 w-4" />
              Statements
            </button>

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

      {/* Important Dates drawer */}
      {datesOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" onClick={() => setDatesOpen(false)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">Important Dates</h2>
                <p className="mt-1 text-sm text-slate-500">Manage paycheck dates and card schedules</p>
              </div>
              <button onClick={() => setDatesOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Card dates */}
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Card Dates</h3>
            <div className="mt-3 space-y-3">
              {cards.filter(c => c.type === 'credit').map(card => (
                <div key={card.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><CreditCard className="h-4 w-4" /></div>
                    <div>
                      <p className="font-bold text-slate-950 text-sm">{card.name}</p>
                      <p className="text-xs text-slate-500">{card.issuer} •••• {card.last4}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="rounded-lg bg-slate-50 p-2.5 block">
                      <p className="text-[10px] font-semibold text-slate-400">Close day</p>
                      <input type="number" min={1} max={31} defaultValue={card.statementCloseDay ?? ''} className="mt-0.5 h-7 w-full rounded border border-slate-200 bg-white px-2 text-sm font-bold outline-none focus:border-indigo-400" onBlur={async e => {
                        const v = parseInt(e.target.value, 10);
                        if (v >= 1 && v <= 31 && v !== card.statementCloseDay) {
                          await fetch(`/api/cards/${card.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statementCloseDay: v }) });
                          fetch('/api/cards').then(r => r.json()).then(setCards).catch(() => {});
                        }
                      }} />
                    </label>
                    <label className="rounded-lg bg-slate-50 p-2.5 block">
                      <p className="text-[10px] font-semibold text-slate-400">Due day</p>
                      <input type="number" min={1} max={31} defaultValue={(card as Card & { paymentDueDay?: number | null }).paymentDueDay ?? ''} placeholder="Not set" className="mt-0.5 h-7 w-full rounded border border-slate-200 bg-white px-2 text-sm font-bold outline-none focus:border-indigo-400" onBlur={async e => {
                        const v = e.target.value ? parseInt(e.target.value, 10) : null;
                        await fetch(`/api/cards/${card.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentDueDay: v }) });
                        fetch('/api/cards').then(r => r.json()).then(setCards).catch(() => {});
                      }} />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Paycheck rules */}
            <h3 className="mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">Paycheck Dates</h3>
            <div className="mt-3 space-y-2">
              {paycheckRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{rule.label}</p>
                    <p className="text-xs text-slate-500">
                      {rule.frequency === 'twice_monthly'
                        ? `${rule.dayOfMonth}th & ${rule.secondDayOfMonth}th of each month`
                        : `${rule.dayOfMonth}th of each month`}
                    </p>
                  </div>
                  <button onClick={() => {
                    const next = paycheckRules.filter(r => r.id !== rule.id);
                    setPaycheckRules(next);
                    savePaycheckRules(next);
                  }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {paycheckRules.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">No paycheck dates configured</p>
              )}
            </div>

            {/* Add paycheck form */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500">Add paycheck date</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-400">Label</span>
                  <input value={pcLabel} onChange={e => setPcLabel(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-indigo-400" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-400">Frequency</span>
                  <select value={pcFreq} onChange={e => setPcFreq(e.target.value as 'monthly' | 'twice_monthly')} className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-indigo-400">
                    <option value="monthly">Monthly</option>
                    <option value="twice_monthly">Twice monthly</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-400">Day</span>
                  <input type="number" min={1} max={31} value={pcDay1} onChange={e => setPcDay1(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-indigo-400" />
                </label>
                {pcFreq === 'twice_monthly' && (
                  <label className="block">
                    <span className="text-[10px] font-semibold text-slate-400">2nd day</span>
                    <input type="number" min={1} max={31} value={pcDay2} onChange={e => setPcDay2(e.target.value)} placeholder="Last day" className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-indigo-400" />
                  </label>
                )}
              </div>
              <button onClick={() => {
                const day = parseInt(pcDay1, 10);
                if (!pcLabel.trim() || !(day >= 1 && day <= 31)) return;
                const rule: PaycheckRule = {
                  id: Date.now().toString(),
                  label: pcLabel.trim(),
                  frequency: pcFreq,
                  dayOfMonth: day,
                  ...(pcFreq === 'twice_monthly' && pcDay2 ? { secondDayOfMonth: parseInt(pcDay2, 10) } : {}),
                };
                const next = [...paycheckRules, rule];
                setPaycheckRules(next);
                savePaycheckRules(next);
                setPcLabel('Paycheck'); setPcDay1('15'); setPcDay2('');
              }} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                Add
              </button>
            </div>

            {/* Recurring transactions link */}
            <h3 className="mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">Recurring Transactions</h3>
            <p className="mt-2 text-xs text-slate-400">Recurring transactions are managed when adding transactions with the recurring toggle.</p>
          </div>
        </div>
      )}

      {/* Statements drawer */}
      {stmtOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" onClick={() => setStmtOpen(false)}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">Statement Balances</h2>
                <p className="mt-1 text-sm text-slate-500">Enter statement totals to track unentered expenses</p>
              </div>
              <button onClick={() => setStmtOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {/* Add statement balance */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 mb-6">
              <p className="text-xs font-semibold text-slate-500">Add statement balance</p>
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-400">Card</span>
                  <select value={stCard} onChange={e => {
                    setStCard(e.target.value);
                    const c = cards.find(x => x.id === e.target.value);
                    if (c?.statementCloseDay) setStCycles(listRecentCycles(c.statementCloseDay, 12).map(cy => ({ key: cy.key, label: cy.label })));
                    else setStCycles([]);
                  }} className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none">
                    <option value="">Select…</option>
                    {cards.filter(c => c.type === 'credit').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-400">Cycle</span>
                  <select value={stCycle} onChange={e => setStCycle(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none">
                    <option value="">Select…</option>
                    {stCycles.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-400">Statement total <span className="rounded bg-rose-100 px-1 py-0.5 text-[8px] font-bold text-rose-600">Expense</span></span>
                  <input value={stAmount} onChange={e => setStAmount(e.target.value)} placeholder="1200" inputMode="decimal"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); saveStatement(); } }}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none" />
                  <span className="mt-1 block text-[9px] text-slate-400">Enter as positive. Stored as expense.</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={saveStatement} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">Save</button>
                <span className="text-[9px] text-slate-400">Press Enter to save</span>
              </div>
            </div>

            {/* Statement balances table */}
            <div className="space-y-2">
              {stmtBalances.map(sb => (
                <div key={sb.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{sb.card.name} •••• {sb.card.last4}</p>
                      <p className="text-xs text-slate-500">{sb.cycleKey}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sb.status === 'reconciled' ? 'bg-emerald-100 text-emerald-700' : sb.status === 'over-entered' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {sb.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-[10px] text-slate-400">Statement</p>
                      <p className="font-bold">{formatUSD(sb.statementTotalCents)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-[10px] text-slate-400">Entered</p>
                      <p className="font-bold">{formatUSD(sb.manualTotal)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-[10px] text-slate-400">Adjustment</p>
                      <p className={`font-bold ${sb.adjustment < 0 ? 'text-red-600' : sb.adjustment > 0 ? 'text-emerald-600' : ''}`}>{formatUSD(sb.adjustment)}</p>
                    </div>
                  </div>
                  <button onClick={async () => {
                    await fetch(`/api/statements?id=${sb.id}`, { method: 'DELETE' });
                    fetch('/api/statements').then(r => r.json()).then(setStmtBalances).catch(() => {});
                  }} className="mt-2 text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>
              ))}
              {stmtBalances.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">No statement balances entered yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
