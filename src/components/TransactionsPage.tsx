'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { ListChecks, Plus, ArrowUp, ArrowDown, Pencil, Trash2, ChevronDown, ChevronRight, Check, Keyboard, X } from 'lucide-react';
import { formatUSD, toCents } from '@/lib/money';
import { SUGGESTED_CATEGORIES, categoryColor } from '@/lib/categories';
import type { StatementCycle } from '@/lib/cycle';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Card { id: string; name: string; issuer: string; last4: string; type: string; statementCloseDay: number | null; }
interface Txn {
  id: string; cardId: string; date: string; merchant: string; amountCents: number;
  category: string; notes?: string | null; cycleKey: string | null; cycleLabel: string | null;
  card: { id: string; name: string; type: string; statementCloseDay: number | null };
}
type SortKey = 'date' | 'amt';

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { headers: init.body ? { 'Content-Type': 'application/json' } : undefined, ...init });
  if (!res.ok) { let msg = `Request failed (${res.status})`; try { const b = await res.json(); if (b?.error) msg = typeof b.error === 'string' ? b.error : JSON.stringify(b.error); } catch {} throw new Error(msg); }
  return res.status === 204 ? (undefined as T) : res.json();
}

const todayYMD = () => new Date().toISOString().slice(0, 10);
const centsToInput = (c: number) => (c / 100).toFixed(2);
function calendarMonth(dateStr: string) {
  const [, m] = dateStr.split('-').map(Number);
  return MONTHS[m - 1];
}

export default function TransactionsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [cycles, setCycles] = useState<StatementCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fCard, setFCard] = useState('');
  const [fCycle, setFCycle] = useState('');
  const [fCat, setFCat] = useState('');
  const [fFrom, setFFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [fTo, setFTo] = useState(() => todayYMD());

  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [fmDate, setFmDate] = useState(todayYMD());
  const [fmMerchant, setFmMerchant] = useState('');
  const [fmAmount, setFmAmount] = useState('');
  const [fmCat, setFmCat] = useState('');
  const [fmCard, setFmCard] = useState('');
  const [fmNotes, setFmNotes] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [creditOpen, setCreditOpen] = useState(true);
  const [debitOpen, setDebitOpen] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => { api<Card[]>('/api/cards').then(setCards).catch(() => setError('Could not load cards.')); }, []);

  const selectedCardIsDebit = useMemo(() => {
    if (!fCard) return false;
    return cards.find(c => c.id === fCard)?.type === 'debit';
  }, [fCard, cards]);

  useEffect(() => {
    setFCycle('');
    if (!fCard || selectedCardIsDebit) { setCycles([]); return; }
    api<StatementCycle[]>(`/api/cards/${fCard}/cycles?count=12`).then(setCycles).catch(() => setCycles([]));
  }, [fCard, selectedCardIsDebit]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (fCard) params.set('cardId', fCard);
    if (fCard && fCycle && !selectedCardIsDebit) params.set('cycle', fCycle);
    if (fCat) params.set('category', fCat);
    if (fFrom) params.set('from', fFrom);
    if (fTo) params.set('to', fTo);
    setLoading(true);
    api<Txn[]>(`/api/transactions?${params.toString()}`)
      .then(d => { setTxns(d); setError(null); })
      .catch(() => setError('Could not load transactions.'))
      .finally(() => setLoading(false));
  }, [fCard, fCycle, fCat, fFrom, fTo, selectedCardIsDebit]);

  const sorted = useMemo(() => [...txns].sort((a, b) => {
    const x = sortKey === 'date' ? a.date.localeCompare(b.date) : a.amountCents - b.amountCents;
    return x * sortDir;
  }), [txns, sortKey, sortDir]);

  const hasDebit = useMemo(() => cards.some(c => c.type === 'debit'), [cards]);
  const creditTxns = useMemo(() => sorted.filter(t => t.card.type === 'credit'), [sorted]);
  const debitTxns = useMemo(() => sorted.filter(t => t.card.type === 'debit'), [sorted]);
  const net = useMemo(() => sorted.reduce((s, t) => s + t.amountCents, 0), [sorted]);
  const creditNet = useMemo(() => creditTxns.reduce((s, t) => s + t.amountCents, 0), [creditTxns]);
  const debitNet = useMemo(() => debitTxns.reduce((s, t) => s + t.amountCents, 0), [debitTxns]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortKey(key); setSortDir(-1); }
  }

  function refresh() {
    const params = new URLSearchParams({
      ...(fCard && { cardId: fCard }),
      ...(fCard && fCycle && !selectedCardIsDebit && { cycle: fCycle }),
      ...(fCat && { category: fCat }),
      ...(fFrom && { from: fFrom }),
      ...(fTo && { to: fTo }),
    });
    api<Txn[]>(`/api/transactions?${params.toString()}`).then(setTxns).catch(() => setError('Could not refresh.'));
  }

  async function showAllDates() {
    try {
      const all = await api<Txn[]>('/api/transactions');
      if (all.length === 0) return;
      const dates = all.map(t => t.date).sort();
      setFFrom(dates[0]);
      setFTo(dates[dates.length - 1]);
    } catch {}
  }

  function showThisMonth() {
    const now = new Date();
    setFFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
    setFTo(todayYMD());
  }

  function openAdd() {
    setEditing(null); setFmDate(todayYMD()); setFmMerchant(''); setFmAmount('');
    setFmCat(''); setFmCard(fCard || cards[0]?.id || ''); setFmNotes(''); setFormErr(''); setShowForm(true);
  }
  function openEdit(t: Txn) {
    setEditing(t.id); setFmDate(t.date); setFmMerchant(t.merchant); setFmAmount(centsToInput(t.amountCents));
    setFmCat(t.category); setFmCard(t.cardId); setFmNotes(t.notes ?? ''); setFormErr(''); setShowForm(true);
  }

  async function save() {
    setFormErr('');
    if (!fmCard) return setFormErr('Pick a card.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fmDate)) return setFormErr('Enter a valid date.');
    if (!fmMerchant.trim()) return setFormErr('Merchant is required.');
    let amountCents: number;
    try { amountCents = toCents(fmAmount); } catch { return setFormErr('Enter a valid amount.'); }
    if (!fmCat.trim()) return setFormErr('Pick or type a category.');
    setSaving(true);
    try {
      const body = JSON.stringify({ cardId: fmCard, date: fmDate, merchant: fmMerchant.trim(), amountCents, category: fmCat.trim(), notes: fmNotes.trim() || null });
      if (editing) await api(`/api/transactions/${editing}`, { method: 'PATCH', body });
      else await api('/api/transactions', { method: 'POST', body });
      setShowForm(false);
      showToast(`Transaction ${editing ? 'updated' : 'saved'} — ${fmMerchant.trim()} ${formatUSD(amountCents)}`);
      refresh();
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setSaving(false); }
  }

  function handleFormKeyDown(e: React.KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (e.key === 'Enter' && target.tagName !== 'TEXTAREA' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      save();
    }
  }

  async function confirmDelete(id: string) {
    try { await api(`/api/transactions/${id}`, { method: 'DELETE' }); setPending(null); showToast('Transaction deleted'); refresh(); }
    catch { setError('Could not delete.'); }
  }

  function periodLabel(t: Txn) {
    if (t.cycleLabel) return t.cycleLabel.replace(/ 20\d\d$/, '');
    return calendarMonth(t.date);
  }

  function renderRow(t: Txn) {
    if (t.id === pending) {
      return (
        <tr key={t.id} className="border-b border-slate-100">
          <td colSpan={7} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px]">Delete <span className="font-medium">{t.merchant}</span> ({formatUSD(t.amountCents)})?</span>
              <div className="flex gap-2">
                <button onClick={() => setPending(null)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={() => confirmDelete(t.id)} className="rounded-xl border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50">Delete</button>
              </div>
            </div>
          </td>
        </tr>
      );
    }
    return (
      <tr key={t.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/50">
        <td className="px-5 py-3.5 text-sm font-medium text-slate-500">{t.date.slice(5)}</td>
        <td className="px-5 py-3.5 text-sm font-semibold">{t.merchant}</td>
        <td className="px-5 py-3.5 text-sm">
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style={{ background: categoryColor(t.category) }} />
          {t.category}
        </td>
        <td className="px-5 py-3.5 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{periodLabel(t)}</span>
        </td>
        <td className={`px-5 py-3.5 text-sm text-right font-bold ${t.amountCents < 0 ? 'text-emerald-600' : ''}`}>{formatUSD(t.amountCents)}</td>
        <td className="px-5 py-3.5 text-sm text-slate-500 break-words">{t.notes || ''}</td>
        <td className="px-5 py-3.5 text-right">
          <span className="inline-flex gap-1 text-slate-400">
            <button onClick={() => openEdit(t)} aria-label="Edit" className="rounded-lg p-1 hover:bg-slate-100 hover:text-indigo-600 transition-colors"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => setPending(t.id)} aria-label="Delete" className="rounded-lg p-1 hover:bg-slate-100 hover:text-rose-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
          </span>
        </td>
      </tr>
    );
  }

  function renderTable(rows: Txn[]) {
    return (
      <table className="w-full min-w-[720px] border-collapse table-fixed">
        <colgroup>
          <col className="w-[8%]" />
          <col className="w-[14%]" />
          <col className="w-[12%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[30%]" />
          <col className="w-14" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-100">
            <SortTh onClick={() => toggleSort('date')} active={sortKey === 'date'} dir={sortDir}>Date</SortTh>
            <th className={thCls}>Merchant</th>
            <th className={thCls}>Category</th>
            <th className={thCls}>Period</th>
            <SortTh onClick={() => toggleSort('amt')} active={sortKey === 'amt'} dir={sortDir} align="right">Amount</SortTh>
            <th className={thCls}>Notes</th>
            <th className={thCls} />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">No transactions match these filters.</td></tr>
          ) : rows.map(renderRow)}
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ListChecks className="h-6 w-6 text-slate-500" />
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          </div>
          <p className="mt-2 text-slate-500">Review spending by card, cycle, category, and date range.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition"
        >
          <Plus className="h-4 w-4" /> Add Transaction
        </button>
      </div>

      {/* Card tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFCard('')}
            className={`relative rounded-xl px-4 py-3 text-sm font-semibold transition ${!fCard ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
          >
            <span className="flex items-center gap-2">
              {!fCard && <Check className="h-4 w-4" />}
              All Cards
              <span className="text-xs font-medium text-slate-400">({sorted.length})</span>
            </span>
          </button>
          {cards.map(c => {
            const active = fCard === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFCard(c.id)}
                className={`relative rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
              >
                <span className="flex items-center gap-2">
                  {active && <Check className="h-4 w-4" />}
                  {c.name}
                  <span className="text-xs font-medium text-slate-400">•••• {c.last4}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={fCycle} onChange={(e) => setFCycle(e.target.value)} disabled={!fCard || selectedCardIsDebit} title={selectedCardIsDebit ? 'Debit cards have no cycle' : !fCard ? 'Select a card' : ''} className={`${selCls} disabled:opacity-40`}>
          <option value="">{selectedCardIsDebit ? 'N/A (debit)' : fCard ? 'All cycles' : 'Cycle (pick a card)'}</option>
          {cycles.map(cy => <option key={cy.key} value={cy.key}>{cy.label}</option>)}
        </select>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={selCls}>
          <option value="">All categories</option>
          {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={selCls} aria-label="From date" />
        <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={selCls} aria-label="To date" />
        <button onClick={showAllDates} className={btnCls}>All time</button>
        <button onClick={showThisMonth} className={btnCls}>This month</button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Add/Edit form */}
      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onKeyDown={handleFormKeyDown}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">{editing ? 'Edit Transaction' : 'Add Transaction'}</h2>
            <button onClick={() => setShowForm(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FmField label="Date"><input type="date" value={fmDate} onChange={e => setFmDate(e.target.value)} className={fmInputCls} /></FmField>
            <FmField label="Card">
              <select value={fmCard} onChange={e => setFmCard(e.target.value)} className={fmInputCls}>
                <option value="">Select…</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name} ·· {c.last4}</option>)}
              </select>
            </FmField>
            <FmField label="Amount (negative for refund)"><input value={fmAmount} onChange={e => setFmAmount(e.target.value)} inputMode="decimal" placeholder="12.50 or 10+5.99" className={fmInputCls} autoFocus /></FmField>
            <FmField label="Merchant"><input value={fmMerchant} onChange={e => setFmMerchant(e.target.value)} placeholder="e.g. Whole Foods" className={fmInputCls} /></FmField>
            <FmField label="Category">
              <input list="cc-cats" value={fmCat} onChange={e => setFmCat(e.target.value)} placeholder="Dining" className={fmInputCls} />
              <datalist id="cc-cats">{SUGGESTED_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
            </FmField>
            <FmField label="Notes (optional)"><input value={fmNotes} onChange={e => setFmNotes(e.target.value)} placeholder="Optional notes" className={fmInputCls} /></FmField>
          </div>
          {formErr && <p className="mt-3 text-xs text-rose-600">{formErr}</p>}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              <Keyboard className="h-4 w-4" />
              Press Enter to save
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {saving ? 'Saving…' : 'Save'}
                <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs">Enter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-slate-500">
        {loading ? 'Loading…' : `Showing ${sorted.length} transaction${sorted.length === 1 ? '' : 's'} · ${formatUSD(net)} net`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {hasDebit && !fCard ? (
          <div>
            <div className="border-b border-slate-100 px-5 py-4">
              <button onClick={() => setCreditOpen(o => !o)} className="flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-slate-900">
                {creditOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Credit cards ({creditTxns.length}) · {formatUSD(creditNet)} net
              </button>
            </div>
            {creditOpen && renderTable(creditTxns)}
            <div className="border-b border-slate-100 px-5 py-4">
              <button onClick={() => setDebitOpen(o => !o)} className="flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-slate-900">
                {debitOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Debit cards ({debitTxns.length}) · {formatUSD(debitNet)} net
              </button>
            </div>
            {debitOpen && renderTable(debitTxns)}
          </div>
        ) : (
          renderTable(sorted)
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed right-8 top-8 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl animate-in fade-in slide-in-from-top-3">
          <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold">Success</p>
            <p className="text-xs text-slate-500">{toast}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const selCls = 'h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm outline-none transition hover:border-indigo-300 hover:shadow-md focus:border-indigo-400';
const btnCls = 'h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-slate-50 transition';
const fmInputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';
const thCls = 'px-5 py-3 text-left text-sm font-semibold text-slate-500';

function SortTh({ children, onClick, active, dir, align = 'left' }: { children: React.ReactNode; onClick: () => void; active: boolean; dir: 1 | -1; align?: 'left' | 'right' }) {
  return (
    <th onClick={onClick} className={`${thCls} cursor-pointer select-none ${align === 'right' ? 'text-right' : ''}`}>
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {children}
        {active && (dir === -1 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </span>
    </th>
  );
}

function FmField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}
