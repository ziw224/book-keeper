'use client';

/**
 * CardCycle — Transactions page (task T8: transactions/page.tsx + FilterBar + TransactionForm).
 *
 * Self-contained client component; wire app/transactions/page.tsx to render <TransactionsPage />.
 * Consolidates filter bar + table + add/edit form + delete into one file for a clean MVP.
 *
 * API (all money in CENTS):
 *   GET    /api/transactions?cardId&cycle=YYYY-MM&category&from&to   -> Txn[]  (each includes derived cycleKey/cycleLabel)
 *   POST   /api/transactions
 *   PATCH  /api/transactions/:id
 *   DELETE /api/transactions/:id
 *   GET    /api/cards
 *   GET    /api/cards/:id/cycles?count=12   -> StatementCycle[]
 *
 * Libs: formatUSD + toCents (@/lib/money), SUGGESTED_CATEGORIES + categoryColor (@/lib/categories).
 * Icons: lucide-react.
 */

import { useEffect, useMemo, useState } from 'react';
import { ListChecks, Plus, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { formatUSD, toCents } from '@/lib/money';
import { SUGGESTED_CATEGORIES, categoryColor } from '@/lib/categories';
import type { StatementCycle } from '@/lib/cycle';

interface Card {
  id: string;
  name: string;
  issuer: string;
  last4: string;
  statementCloseDay: number;
}
interface Txn {
  id: string;
  cardId: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amountCents: number;
  category: string;
  notes?: string | null;
  cycleKey: string;
  cycleLabel: string;
}

type SortKey = 'date' | 'amt';

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const b = await res.json();
      if (b?.error) msg = b.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const todayYMD = () => new Date().toISOString().slice(0, 10);
const centsToInput = (c: number) => (c / 100).toFixed(2);

export default function TransactionsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [cycles, setCycles] = useState<StatementCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [fCard, setFCard] = useState('');
  const [fCycle, setFCycle] = useState('');
  const [fCat, setFCat] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  // Form
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

  // Load cards once.
  useEffect(() => {
    api<Card[]>('/api/cards')
      .then(setCards)
      .catch(() => setError('Could not load your cards.'));
  }, []);

  // Cycle options track the selected card (cycles differ per card).
  useEffect(() => {
    setFCycle('');
    if (!fCard) {
      setCycles([]);
      return;
    }
    api<StatementCycle[]>(`/api/cards/${fCard}/cycles?count=12`)
      .then(setCycles)
      .catch(() => setCycles([]));
  }, [fCard]);

  // Load transactions whenever a filter changes.
  useEffect(() => {
    const params = new URLSearchParams();
    if (fCard) params.set('cardId', fCard);
    if (fCard && fCycle) params.set('cycle', fCycle);
    if (fCat) params.set('category', fCat);
    if (fFrom) params.set('from', fFrom);
    if (fTo) params.set('to', fTo);
    setLoading(true);
    api<Txn[]>(`/api/transactions?${params.toString()}`)
      .then((d) => {
        setTxns(d);
        setError(null);
      })
      .catch(() => setError('Could not load transactions.'))
      .finally(() => setLoading(false));
  }, [fCard, fCycle, fCat, fFrom, fTo]);

  const sorted = useMemo(() => {
    return [...txns].sort((a, b) => {
      const x = sortKey === 'date' ? a.date.localeCompare(b.date) : a.amountCents - b.amountCents;
      return x * sortDir;
    });
  }, [txns, sortKey, sortDir]);

  const net = useMemo(() => sorted.reduce((acc, t) => acc + t.amountCents, 0), [sorted]);
  const cardLabel = (id: string) => {
    const c = cards.find((x) => x.id === id);
    return c ? `${c.name} ·· ${c.last4}` : '';
  };

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  function refresh() {
    // re-run the transactions effect by nudging a filter-independent reload
    api<Txn[]>(`/api/transactions?${new URLSearchParams({
      ...(fCard && { cardId: fCard }),
      ...(fCard && fCycle && { cycle: fCycle }),
      ...(fCat && { category: fCat }),
      ...(fFrom && { from: fFrom }),
      ...(fTo && { to: fTo }),
    }).toString()}`)
      .then(setTxns)
      .catch(() => setError('Could not refresh transactions.'));
  }

  function openAdd() {
    setEditing(null);
    setFmDate(todayYMD());
    setFmMerchant('');
    setFmAmount('');
    setFmCat('');
    setFmCard(fCard || cards[0]?.id || '');
    setFmNotes('');
    setFormErr('');
    setShowForm(true);
  }

  function openEdit(t: Txn) {
    setEditing(t.id);
    setFmDate(t.date);
    setFmMerchant(t.merchant);
    setFmAmount(centsToInput(t.amountCents));
    setFmCat(t.category);
    setFmCard(t.cardId);
    setFmNotes(t.notes ?? '');
    setFormErr('');
    setShowForm(true);
  }

  async function save() {
    setFormErr('');
    if (!fmCard) return setFormErr('Pick a card.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fmDate)) return setFormErr('Enter a valid date.');
    if (!fmMerchant.trim()) return setFormErr('Merchant is required.');
    let amountCents: number;
    try {
      amountCents = toCents(fmAmount);
    } catch {
      return setFormErr('Enter a valid amount (negative for refunds).');
    }
    if (!fmCat.trim()) return setFormErr('Pick or type a category.');

    setSaving(true);
    try {
      const body = JSON.stringify({
        cardId: fmCard,
        date: fmDate,
        merchant: fmMerchant.trim(),
        amountCents,
        category: fmCat.trim(),
        notes: fmNotes.trim() || null,
      });
      if (editing) await api(`/api/transactions/${editing}`, { method: 'PATCH', body });
      else await api('/api/transactions', { method: 'POST', body });
      setShowForm(false);
      refresh();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Could not save the transaction.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(id: string) {
    try {
      await api(`/api/transactions/${id}`, { method: 'DELETE' });
      setPending(null);
      refresh();
    } catch {
      setError('Could not delete the transaction.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-neutral-500" />
          <span className="text-lg font-medium text-neutral-900">Transactions</span>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2">
        <select value={fCard} onChange={(e) => setFCard(e.target.value)} className={selCls}>
          <option value="">All cards</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ·· {c.last4}
            </option>
          ))}
        </select>
        <select
          value={fCycle}
          onChange={(e) => setFCycle(e.target.value)}
          disabled={!fCard}
          title={fCard ? '' : 'Select a card to filter by cycle'}
          className={`${selCls} disabled:opacity-50`}
        >
          <option value="">{fCard ? 'All cycles' : 'Cycle (pick a card)'}</option>
          {cycles.map((cy) => (
            <option key={cy.key} value={cy.key}>
              {cy.label}
            </option>
          ))}
        </select>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={selCls}>
          <option value="">All categories</option>
          {SUGGESTED_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={selCls} aria-label="From date" />
        <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={selCls} aria-label="To date" />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Add / edit form */}
      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-[13px] text-neutral-500">{editing ? 'Edit transaction' : 'Add a transaction'}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Date">
              <input type="date" value={fmDate} onChange={(e) => setFmDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Card">
              <select value={fmCard} onChange={(e) => setFmCard(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ·· {c.last4}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount (negative for refund)">
              <input
                value={fmAmount}
                onChange={(e) => setFmAmount(e.target.value)}
                inputMode="decimal"
                placeholder="12.50"
                className={inputCls}
              />
            </Field>
            <Field label="Merchant">
              <input value={fmMerchant} onChange={(e) => setFmMerchant(e.target.value)} placeholder="e.g. Whole Foods" className={inputCls} />
            </Field>
            <Field label="Category">
              <input list="cc-cats" value={fmCat} onChange={(e) => setFmCat(e.target.value)} placeholder="Dining" className={inputCls} />
              <datalist id="cc-cats">
                {SUGGESTED_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Notes (optional)">
              <input value={fmNotes} onChange={(e) => setFmNotes(e.target.value)} placeholder="—" className={inputCls} />
            </Field>
          </div>
          {formErr && <p className="mt-2.5 text-xs text-rose-600">{formErr}</p>}
          <div className="mt-3.5 flex gap-2">
            <button onClick={save} disabled={saving} className="rounded-lg border border-neutral-300 px-3.5 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">
              {saving ? 'Saving…' : editing ? 'Update transaction' : 'Save transaction'}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-neutral-300 px-3.5 py-2 text-sm hover:bg-neutral-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className="text-[13px] text-neutral-500">
        {loading ? 'Loading…' : `Showing ${sorted.length} transaction${sorted.length === 1 ? '' : 's'} · ${formatUSD(net)} net`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <Th onClick={() => toggleSort('date')} active={sortKey === 'date'} dir={sortDir}>
                Date
              </Th>
              <th className={thCls}>Merchant</th>
              <th className={thCls}>Category</th>
              <th className={thCls}>Cycle</th>
              <Th onClick={() => toggleSort('amt')} active={sortKey === 'amt'} dir={sortDir} align="right">
                Amount
              </Th>
              <th className={`${thCls} w-16`} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-neutral-400">
                  No transactions match these filters.
                </td>
              </tr>
            ) : (
              sorted.map((t) =>
                t.id === pending ? (
                  <tr key={t.id} className="border-b border-neutral-100">
                    <td colSpan={6} className="px-2.5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[13px] text-neutral-900">
                          Delete <span className="font-medium">{t.merchant}</span> ({formatUSD(t.amountCents)})?
                        </span>
                        <div className="flex gap-2">
                          <button onClick={() => setPending(null)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
                            Cancel
                          </button>
                          <button onClick={() => confirmDelete(t.id)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
                            Delete
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className="border-b border-neutral-100">
                    <td className={`${tdCls} text-neutral-500`}>{t.date.slice(5)}</td>
                    <td className={`${tdCls} truncate`}>{t.merchant}</td>
                    <td className={tdCls}>
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style={{ background: categoryColor(t.category) }} />
                      {t.category}
                    </td>
                    <td className={tdCls}>
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                        {t.cycleLabel.replace(/ 20\d\d$/, '')}
                      </span>
                    </td>
                    <td className={`${tdCls} text-right ${t.amountCents < 0 ? 'text-emerald-600' : 'text-neutral-900'}`}>
                      {formatUSD(t.amountCents)}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button onClick={() => openEdit(t)} aria-label="Edit" className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setPending(t.id)} aria-label="Delete" className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const selCls = 'h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-400';
const inputCls = 'h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-400';
const thCls = 'border-b border-neutral-200 px-2.5 py-2 text-left text-xs font-normal text-neutral-500';
const tdCls = 'border-b border-neutral-100 px-2.5 py-2.5 text-[13px] text-neutral-900';

function Th({
  children,
  onClick,
  active,
  dir,
  align = 'left',
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: 1 | -1;
  align?: 'left' | 'right';
}) {
  return (
    <th
      onClick={onClick}
      className={`${thCls} cursor-pointer select-none ${align === 'right' ? 'text-right' : ''}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {children}
        {active && (dir === -1 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </span>
    </th>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
