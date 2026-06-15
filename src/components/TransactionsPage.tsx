'use client';

import { useEffect, useMemo, useState } from 'react';
import { ListChecks, Plus, ArrowUp, ArrowDown, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [y, m] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
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
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

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

  const [creditOpen, setCreditOpen] = useState(true);
  const [debitOpen, setDebitOpen] = useState(true);

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
      setShowForm(false); refresh();
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setSaving(false); }
  }

  async function confirmDelete(id: string) {
    try { await api(`/api/transactions/${id}`, { method: 'DELETE' }); setPending(null); refresh(); }
    catch { setError('Could not delete.'); }
  }

  function periodLabel(t: Txn) {
    if (t.cycleLabel) return t.cycleLabel.replace(/ 20\d\d$/, '');
    return calendarMonth(t.date).replace(/ 20\d\d$/, '');
  }

  function renderRow(t: Txn) {
    if (t.id === pending) {
      return (
        <tr key={t.id} className="border-b border-neutral-100">
          <td colSpan={6} className="px-2.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px]">Delete <span className="font-medium">{t.merchant}</span> ({formatUSD(t.amountCents)})?</span>
              <div className="flex gap-2">
                <button onClick={() => setPending(null)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">Cancel</button>
                <button onClick={() => confirmDelete(t.id)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">Delete</button>
              </div>
            </div>
          </td>
        </tr>
      );
    }
    return (
      <tr key={t.id} className="border-b border-neutral-100">
        <td className={`${tdCls} text-neutral-500`}>{t.date.slice(5)}</td>
        <td className={`${tdCls} truncate`}>{t.merchant}</td>
        <td className={tdCls}>
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style={{ background: categoryColor(t.category) }} />
          {t.category}
        </td>
        <td className={tdCls}>
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">{periodLabel(t)}</span>
        </td>
        <td className={`${tdCls} text-right ${t.amountCents < 0 ? 'text-emerald-600' : 'text-neutral-900'}`}>{formatUSD(t.amountCents)}</td>
        <td className={`${tdCls} text-right`}>
          <button onClick={() => openEdit(t)} aria-label="Edit" className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => setPending(t.id)} aria-label="Delete" className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"><Trash2 className="h-4 w-4" /></button>
        </td>
      </tr>
    );
  }

  function renderTable(rows: Txn[]) {
    return (
      <table className="w-full min-w-[640px] border-collapse table-fixed">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[22%]" />
          <col className="w-[18%]" />
          <col className="w-[14%]" />
          <col className="w-[16%]" />
          <col className="w-16" />
        </colgroup>
        <thead>
          <tr>
            <Th onClick={() => toggleSort('date')} active={sortKey === 'date'} dir={sortDir}>Date</Th>
            <th className={thCls}>Merchant</th>
            <th className={thCls}>Category</th>
            <th className={thCls}>Period</th>
            <Th onClick={() => toggleSort('amt')} active={sortKey === 'amt'} dir={sortDir} align="right">Amount</Th>
            <th className={`${thCls} w-16`} />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="py-8 text-center text-sm text-neutral-400">No transactions match these filters.</td></tr>
          ) : rows.map(renderRow)}
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-neutral-500" />
          <span className="text-lg font-medium text-neutral-900">Transactions</span>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <select value={fCard} onChange={(e) => setFCard(e.target.value)} className={selCls}>
          <option value="">All cards</option>
          {cards.map(c => <option key={c.id} value={c.id}>{c.name} ·· {c.last4}</option>)}
        </select>
        <select value={fCycle} onChange={(e) => setFCycle(e.target.value)} disabled={!fCard || selectedCardIsDebit} title={selectedCardIsDebit ? 'Debit cards have no cycle' : !fCard ? 'Select a card' : ''} className={`${selCls} disabled:opacity-50`}>
          <option value="">{selectedCardIsDebit ? 'N/A (debit)' : fCard ? 'All cycles' : 'Cycle (pick a card)'}</option>
          {cycles.map(cy => <option key={cy.key} value={cy.key}>{cy.label}</option>)}
        </select>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={selCls}>
          <option value="">All categories</option>
          {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={selCls} aria-label="From date" />
        <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={selCls} aria-label="To date" />
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-[13px] text-neutral-500">{editing ? 'Edit transaction' : 'Add a transaction'}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Date"><input type="date" value={fmDate} onChange={e => setFmDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Card">
              <select value={fmCard} onChange={e => setFmCard(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name} ·· {c.last4}</option>)}
              </select>
            </Field>
            <Field label="Amount (negative for refund)"><input value={fmAmount} onChange={e => setFmAmount(e.target.value)} inputMode="decimal" placeholder="12.50" className={inputCls} /></Field>
            <Field label="Merchant"><input value={fmMerchant} onChange={e => setFmMerchant(e.target.value)} placeholder="e.g. Whole Foods" className={inputCls} /></Field>
            <Field label="Category">
              <input list="cc-cats" value={fmCat} onChange={e => setFmCat(e.target.value)} placeholder="Dining" className={inputCls} />
              <datalist id="cc-cats">{SUGGESTED_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Notes (optional)"><input value={fmNotes} onChange={e => setFmNotes(e.target.value)} placeholder="—" className={inputCls} /></Field>
          </div>
          {formErr && <p className="mt-2.5 text-xs text-rose-600">{formErr}</p>}
          <div className="mt-3.5 flex gap-2">
            <button onClick={save} disabled={saving} className="rounded-lg border border-neutral-300 px-3.5 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Update transaction' : 'Save transaction'}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-neutral-300 px-3.5 py-2 text-sm hover:bg-neutral-50">Cancel</button>
          </div>
        </div>
      )}

      <p className="text-[13px] text-neutral-500">
        {loading ? 'Loading…' : `Showing ${sorted.length} transaction${sorted.length === 1 ? '' : 's'} · ${formatUSD(net)} net`}
      </p>

      <div className="overflow-x-auto">
        {hasDebit && !fCard ? (
          <div className="space-y-4">
            {/* Credit section */}
            <div>
              <button onClick={() => setCreditOpen(o => !o)} className="flex items-center gap-1.5 mb-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">
                {creditOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Credit cards ({creditTxns.length}) · {formatUSD(creditNet)} net
              </button>
              {creditOpen && renderTable(creditTxns)}
            </div>
            {/* Debit section */}
            <div>
              <button onClick={() => setDebitOpen(o => !o)} className="flex items-center gap-1.5 mb-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">
                {debitOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Debit cards ({debitTxns.length}) · {formatUSD(debitNet)} net
              </button>
              {debitOpen && renderTable(debitTxns)}
            </div>
          </div>
        ) : (
          renderTable(sorted)
        )}
      </div>
    </div>
  );
}

const selCls = 'h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-400';
const inputCls = 'h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-400';
const thCls = 'border-b border-neutral-200 px-2.5 py-2 text-left text-xs font-normal text-neutral-500';
const tdCls = 'border-b border-neutral-100 px-2.5 py-2.5 text-[13px] text-neutral-900';

function Th({ children, onClick, active, dir, align = 'left' }: { children: React.ReactNode; onClick: () => void; active: boolean; dir: 1 | -1; align?: 'left' | 'right' }) {
  return (
    <th onClick={onClick} className={`${thCls} cursor-pointer select-none ${align === 'right' ? 'text-right' : ''}`}>
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {children}
        {active && (dir === -1 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </span>
    </th>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs text-neutral-500">{label}</span>{children}</label>;
}
