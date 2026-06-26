'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Plus, ChevronDown, ChevronRight, Check, Keyboard, X, Calendar, Tag, Search, Pencil, Trash2 } from 'lucide-react';
import { formatUSD, toCents } from '@/lib/money';
import { SUGGESTED_CATEGORIES, categoryColor, categoryIcon, getAllCategories, addCustomCategory } from '@/lib/categories';
import type { StatementCycle } from '@/lib/cycle';
import CalendarPicker, { CalendarNotice } from '@/components/CalendarPicker';
import { findCanonicalMerchant } from '@/lib/merchant';
import { getPaycheckRules, generatePaycheckDates } from '@/lib/importantDates';
import { kindOf, isUpcoming, visibleRows, computeSummary, rollup, type GroupBy, type TxnRow, type ViewState, type RollupGroup } from '@/lib/txn';

interface Card { id: string; name: string; issuer: string; last4: string; type: string; statementCloseDay: number | null; }
interface Txn extends TxnRow {
  cardId: string; cycleKey: string | null; cycleLabel: string | null;
  isPending?: boolean; paymentStatus?: string; paidDate?: string | null; statementBalanceId?: string; statementTotalCents?: number;
  notes?: string | null;
  card: { id: string; name: string; last4: string; type: string; statementCloseDay: number | null };
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { headers: init.body ? { 'Content-Type': 'application/json' } : undefined, ...init });
  if (!res.ok) { let msg = `Request failed (${res.status})`; try { const b = await res.json(); if (b?.error) msg = typeof b.error === 'string' ? b.error : JSON.stringify(b.error); } catch {} throw new Error(msg); }
  return res.status === 204 ? (undefined as T) : res.json();
}

const todayYMD = () => new Date().toISOString().slice(0, 10);
const pad2 = (n: number) => String(n).padStart(2, '0');
const centsToInput = (c: number) => (c / 100).toFixed(2);

const RECENT_CARD_KEY = 'cardcycle_recent_card_ids';
function rememberCard(cardId: string) { try { const e = JSON.parse(localStorage.getItem(RECENT_CARD_KEY) || '[]'); localStorage.setItem(RECENT_CARD_KEY, JSON.stringify([cardId, ...e.filter((id: string) => id !== cardId)].slice(0, 10))); } catch {} }
function getSortedCards(allCards: Card[]): Card[] { try { const r: string[] = JSON.parse(localStorage.getItem(RECENT_CARD_KEY) || '[]'); return [...allCards].sort((a, b) => { const ai = r.indexOf(a.id), bi = r.indexOf(b.id); if (ai === -1 && bi === -1) return 0; if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi; }); } catch { return allCards; } }

/* ── Dropdown helpers (reused from before, compact) ─────── */
function Dropdown({ value, label, options, onChange, icon: Icon, disabled }: { value: string; label: string; options: { value: string; label: string }[]; onChange: (v: string) => void; icon: React.ElementType; disabled?: boolean }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const c = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); }; document.addEventListener('mousedown', c); document.addEventListener('keydown', k); return () => { document.removeEventListener('mousedown', c); document.removeEventListener('keydown', k); }; }, [open]);
  return (
    <div ref={ref} className="relative w-[160px]">
      <button onClick={() => !disabled && setOpen(o => !o)} disabled={disabled} className={`flex h-9 w-full items-center justify-between rounded-lg border bg-white px-3 text-left text-xs font-semibold shadow-sm transition ${disabled ? 'opacity-40' : open ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}>
        <span className="flex min-w-0 items-center gap-2"><Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" /><span className="truncate">{label}</span></span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
        {options.map(o => <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition hover:bg-slate-50 ${value === o.value ? 'font-semibold text-indigo-600' : 'text-slate-700'}`}>{o.label}{value === o.value && <Check className="h-3.5 w-3.5 text-indigo-600" />}</button>)}
      </div>}
    </div>
  );
}

/* ── ModalDropdown for forms ─────────────────────────────── */
function ModalDropdown({ value, options, onChange, placeholder }: { value: string; options: { value: string; label: string; icon?: React.ReactNode }[]; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const c = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }; document.addEventListener('mousedown', c); document.addEventListener('keydown', k); return () => { document.removeEventListener('mousedown', c); document.removeEventListener('keydown', k); }; }, [open]);
  const display = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className={`flex h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm transition ${open ? 'border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200'}`}>
        <span className="flex min-w-0 items-center gap-2 truncate">{display?.icon}<span className={display ? '' : 'text-slate-400'}>{display?.label || placeholder || 'Select…'}</span></span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="absolute left-0 top-[calc(100%+6px)] z-[60] max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
        {options.map(o => <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${value === o.value ? 'font-semibold text-indigo-600' : 'text-slate-700'}`}>{o.icon}<span className="truncate">{o.label}</span>{value === o.value && <Check className="ml-auto h-4 w-4 shrink-0 text-indigo-600" />}</button>)}
      </div>}
    </div>
  );
}

/* ── CategoryPicker for modal ────────────────────────────── */
function CategoryPickerModal({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [creating, setCreating] = useState(false); const [newIcon, setNewIcon] = useState(''); const [newName, setNewName] = useState(''); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const c = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); setCreating(false); } }; document.addEventListener('mousedown', c); document.addEventListener('keydown', k); return () => { document.removeEventListener('mousedown', c); document.removeEventListener('keydown', k); }; }, [open]);
  const allCats = getAllCategories(); const filtered = allCats.filter(c => c.toLowerCase().includes(query.toLowerCase()));
  const display = value ? `${categoryIcon(value)} ${value}` : '';
  function handleCreate() { const name = newName.trim(); const icon = newIcon.trim() || '📌'; if (!name) return; addCustomCategory(name, icon); onChange(name); setCreating(false); setNewIcon(''); setNewName(''); setOpen(false); }
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className={`flex h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm transition ${open ? 'border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200'}`}>
        <span className={display ? '' : 'text-slate-400'}>{display || 'Select category…'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="absolute left-0 bottom-[calc(100%+6px)] z-[60] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." className="w-full bg-transparent text-sm outline-none" autoFocus /></div>
        <div className="max-h-64 overflow-auto p-1">
          {filtered.map(cat => <button key={cat} type="button" onClick={() => { onChange(cat); setOpen(false); setQuery(''); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 ${value === cat ? 'font-semibold text-indigo-600' : 'text-slate-700'}`}><span className="text-sm">{categoryIcon(cat)}</span>{cat}{value === cat && <Check className="ml-auto h-4 w-4 text-indigo-600" />}</button>)}
          <div className="mt-1 border-t border-slate-100 pt-1">
            {!creating ? <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"><Plus className="h-4 w-4" />Create custom</button>
            : <div className="p-2 space-y-2"><div className="flex gap-2"><input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="😀" className="h-9 w-12 rounded-lg border border-slate-200 text-center text-lg outline-none" maxLength={4} /><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleCreate(); } }} autoFocus /></div><div className="flex gap-2"><button type="button" onClick={handleCreate} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Add</button><button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs">Cancel</button></div></div>}
          </div>
        </div>
      </div>}
    </div>
  );
}

/* ── MerchantAutocomplete ────────────────────────────────── */
function MerchantAutocomplete({ value, onChange, suggestions }: { value: string; onChange: (v: string) => void; suggestions: string[] }) {
  const [open, setOpen] = useState(false); const [focused, setFocused] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const c = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', c); return () => document.removeEventListener('mousedown', c); }, [open]);
  const filtered = value.length >= 1 ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value) : [];
  return (
    <div ref={ref} className="relative">
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => { setFocused(true); setOpen(true); }} onBlur={() => setTimeout(() => setFocused(false), 150)} placeholder="e.g. Whole Foods" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
      {focused && open && filtered.length > 0 && <div className="absolute left-0 top-[calc(100%+4px)] z-[60] max-h-40 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
        {filtered.slice(0, 8).map(s => <button key={s} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(s); setOpen(false); }} className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">{s}</button>)}
      </div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════ */

export default function TransactionsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [cycles, setCycles] = useState<StatementCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [fCard, setFCard] = useState('');
  const [fCycle, setFCycle] = useState('');
  const [fFrom, setFFrom] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-01`; });
  const [fTo, setFTo] = useState(() => todayYMD());
  const [datePreset, setDatePreset] = useState<'month' | 'all' | null>('month');

  // View state
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [showIncome, setShowIncome] = useState(false);
  const [showAdj, setShowAdj] = useState(false);
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [fmDate, setFmDate] = useState(todayYMD());
  const [fmMerchant, setFmMerchant] = useState('');
  const [fmAmount, setFmAmount] = useState('');
  const [fmTxnType, setFmTxnType] = useState<'expense' | 'income'>('expense');
  const [fmCat, setFmCat] = useState('');
  const [fmCard, setFmCard] = useState('');
  const [fmNotes, setFmNotes] = useState('');
  const [fmRecurring, setFmRecurring] = useState(false);
  const [fmRecurFreq, setFmRecurFreq] = useState('monthly');
  const [fmRecurDay, setFmRecurDay] = useState('');
  const [fmRecurEnd, setFmRecurEnd] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(msg: string) { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2500); }

  // Data loading
  useEffect(() => { api<Card[]>('/api/cards').then(setCards).catch(() => setError('Could not load cards.')); api('/api/recurring', { method: 'POST' }).catch(() => {}); }, []);

  const selectedCardIsDebit = useMemo(() => fCard ? cards.find(c => c.id === fCard)?.type === 'debit' : false, [fCard, cards]);

  useEffect(() => { setFCycle(''); if (!fCard || selectedCardIsDebit) { setCycles([]); return; } api<StatementCycle[]>(`/api/cards/${fCard}/cycles?count=12`).then(setCycles).catch(() => setCycles([])); }, [fCard, selectedCardIsDebit]);

  const fetchTxns = useCallback(() => {
    const params = new URLSearchParams();
    if (fCard) params.set('cardId', fCard);
    if (fCard && fCycle && !selectedCardIsDebit) params.set('cycle', fCycle);
    if (fFrom) params.set('from', fFrom);
    if (fTo) params.set('to', fTo);
    setLoading(true);
    api<Txn[]>(`/api/transactions?${params.toString()}`)
      .then(d => { setTxns(d); setError(null); })
      .catch(() => setError('Could not load transactions.'))
      .finally(() => setLoading(false));
  }, [fCard, fCycle, fFrom, fTo, selectedCardIsDebit]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  // View transforms
  const viewState: ViewState = { showIncome, showAdjustments: showAdj, recurringOnly };
  const visible = useMemo(() => visibleRows(txns as TxnRow[], viewState), [txns, showIncome, showAdj, recurringOnly]);
  const summary = useMemo(() => computeSummary(txns as TxnRow[]), [txns]);
  const groups = useMemo(() => rollup(visible as TxnRow[], groupBy), [visible, groupBy]);
  const flatRows = useMemo(() => groupBy === 'none' ? [...visible].sort((a, b) => b.date.localeCompare(a.date)) : [], [visible, groupBy]);

  // Non-expense rows visible in grouped view
  const incomeRows = useMemo(() => visible.filter(t => kindOf(t as TxnRow) === 'income').sort((a, b) => b.date.localeCompare(a.date)), [visible]);
  const adjRows = useMemo(() => visible.filter(t => kindOf(t as TxnRow) === 'adjustment').sort((a, b) => b.date.localeCompare(a.date)), [visible]);

  // Adjustments for the strip (from all txns, not just visible)
  const adjustments = useMemo(() => txns.filter(t => t.isStatementAdjustment), [txns]);

  const allMerchantNames = useMemo(() => [...new Set(txns.map(t => t.merchant))].sort(), [txns]);

  // Calendar notices
  const calendarNotices = useMemo(() => {
    const out: CalendarNotice[] = [];
    const pcDates = generatePaycheckDates(getPaycheckRules());
    for (const pc of pcDates) out.push({ date: pc.date, label: pc.label, color: '#10b981' });
    const now = new Date();
    const relevantCards = fCard ? cards.filter(c => c.id === fCard) : cards;
    for (const c of relevantCards) {
      if (c.type === 'credit' && c.statementCloseDay) {
        for (let offset = -1; offset <= 2; offset++) {
          const m = now.getMonth() + 1 + offset;
          const y = now.getFullYear() + Math.floor((m - 1) / 12);
          const rm = ((m - 1) % 12 + 12) % 12 + 1;
          const dim = new Date(y, rm, 0).getDate();
          const cd = Math.min(c.statementCloseDay, dim);
          out.push({ date: `${y}-${pad2(rm)}-${pad2(cd)}`, label: `${c.name} closes`, color: '#6366f1' });
        }
      }
    }
    return out;
  }, [cards, fCard]);

  // Date helpers
  async function showAllDates() { try { const all = await api<Txn[]>('/api/transactions'); if (all.length === 0) return; const dates = all.map(t => t.date).sort(); setFFrom(dates[0]); setFTo(dates[dates.length - 1]); setDatePreset('all'); } catch {} }
  function showThisMonth() { const n = new Date(); setFFrom(`${n.getFullYear()}-${pad2(n.getMonth() + 1)}-01`); setFTo(todayYMD()); setDatePreset('month'); }

  // Form handlers
  function openAdd() { setEditing(null); setFmDate(todayYMD()); setFmMerchant(''); setFmAmount(''); setFmTxnType('expense'); setFmCat(''); setFmNotes(''); setFormErr(''); setFmRecurring(false); setFmRecurFreq('monthly'); setFmRecurDay(''); setFmRecurEnd(''); const sorted = getSortedCards(cards); setFmCard(fCard || sorted[0]?.id || ''); setShowForm(true); }
  function openEdit(t: Txn) { setEditing(t.id); setFmDate(t.date); setFmMerchant(t.merchant); setFmAmount(centsToInput(Math.abs(t.amountCents))); setFmTxnType(t.amountCents >= 0 ? 'income' : 'expense'); setFmCat(t.category); setFmCard(t.cardId); setFmNotes(t.notes ?? ''); setFormErr(''); setFmRecurring(false); setFmRecurFreq('monthly'); setFmRecurDay(''); setFmRecurEnd(''); setShowForm(true); }

  async function save() {
    setFormErr('');
    if (!fmCard) return setFormErr('Pick a card.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fmDate)) return setFormErr('Enter a valid date.');
    if (!fmMerchant.trim()) return setFormErr('Merchant is required.');
    let amountCents: number;
    try { amountCents = Math.abs(toCents(fmAmount)); } catch { return setFormErr('Enter a valid amount.'); }
    if (fmTxnType === 'expense') amountCents = -amountCents;
    if (fmTxnType === 'expense' && !fmCat.trim()) return setFormErr('Pick a category.');
    setSaving(true);
    try {
      const canonicalMerchant = findCanonicalMerchant(fmMerchant, allMerchantNames);
      const payload: Record<string, unknown> = { cardId: fmCard, date: fmDate, merchant: canonicalMerchant, amountCents, category: fmTxnType === 'income' ? 'Income' : fmCat.trim(), notes: fmNotes.trim() || null };
      if (fmRecurring && !editing) { payload.recurring = true; payload.recurringFrequency = fmRecurFreq; payload.recurringDay = fmRecurDay ? parseInt(fmRecurDay, 10) : parseInt(fmDate.split('-')[2], 10); if (fmRecurEnd) payload.recurringEndDate = fmRecurEnd; }
      const body = JSON.stringify(payload);
      if (editing) await api(`/api/transactions/${editing}`, { method: 'PATCH', body });
      else await api('/api/transactions', { method: 'POST', body });
      rememberCard(fmCard); setShowForm(false);
      showToast(`Transaction ${editing ? 'updated' : 'saved'} — ${fmMerchant.trim()} ${formatUSD(amountCents)}`);
      fetchTxns();
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setSaving(false); }
  }

  function handleFormKeyDown(e: React.KeyboardEvent) { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && !e.nativeEvent.isComposing) { e.preventDefault(); save(); } }

  async function confirmDelete(id: string) { try { await api(`/api/transactions/${id}`, { method: 'DELETE' }); setPending(null); showToast('Transaction deleted'); fetchTxns(); } catch { setError('Could not delete.'); } }
  async function markStatementStatus(sbId: string, status: string, paidDate: string | null) { try { await api('/api/statements', { method: 'PATCH', body: JSON.stringify({ id: sbId, paymentStatus: status, paidDate }) }); showToast(status === 'paid' ? 'Marked as paid' : 'Reverted to pending'); fetchTxns(); } catch { setError('Could not update status.'); } }

  // Toggle group expand
  function toggleGroup(key: string) { setExpanded(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }

  // Cycle dropdown options
  const cycleOptions = [{ value: '', label: selectedCardIsDebit ? 'N/A (debit)' : fCard ? 'All cycles' : 'Cycle (pick a card)' }, ...cycles.map(c => ({ value: c.key, label: c.label }))];

  /* ── RENDER ────────────────────────────────────────────── */
  return (
    <div className="space-y-3">
      {/* Floating add */}
      <button onClick={openAdd} className="group fixed right-8 top-28 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-all duration-200 hover:w-48 hover:px-5">
        <Plus className="h-5 w-5 shrink-0" />
        <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover:ml-2 group-hover:max-w-36 group-hover:opacity-100">Add Transaction</span>
      </button>

      {/* Card tabs */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex overflow-x-auto p-1.5">
          <button onClick={() => setFCard('')} className={`flex min-w-fit items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${!fCard ? 'bg-neutral-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            All Cards <span className="text-xs opacity-60">({cards.length})</span>
          </button>
          {cards.map(c => {
            const active = fCard === c.id;
            return <button key={c.id} onClick={() => setFCard(c.id)} className={`flex min-w-fit items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-neutral-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {c.name} <span className="text-xs opacity-60">•••• {c.last4}</span>
            </button>;
          })}
        </div>
      </div>

      {/* Filter bar */}
      <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm overflow-visible">
        <div className="flex flex-nowrap items-center gap-2">
          <Dropdown value={fCycle} label={cycles.find(c => c.key === fCycle)?.label || cycleOptions[0].label} options={cycleOptions} onChange={setFCycle} icon={Calendar} disabled={!fCard || selectedCardIsDebit} />
          <div className="flex items-center gap-2">
            <div className="w-36"><CalendarPicker value={fFrom} onChange={v => { setFFrom(v); setDatePreset(null); }} notices={calendarNotices} placeholder="Start" /></div>
            <span className="text-slate-400 text-xs">–</span>
            <div className="w-36"><CalendarPicker value={fTo} onChange={v => { setFTo(v); setDatePreset(null); }} notices={calendarNotices} placeholder="End" /></div>
          </div>
          <button onClick={showAllDates} className={`h-9 rounded-lg border px-2.5 text-xs font-bold shadow-sm transition ${datePreset === 'all' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>All time</button>
          <button onClick={showThisMonth} className={`h-9 rounded-lg border px-2.5 text-xs font-bold shadow-sm transition ${datePreset === 'month' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>This month</button>
        </div>
      </section>

      {/* Group-by + toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-neutral-100 p-0.5">
          {(['category', 'merchant', 'card', 'none'] as GroupBy[]).map(g => (
            <button key={g} onClick={() => setGroupBy(g)} className={`rounded-md px-3 py-1 text-xs font-semibold transition ${groupBy === g ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}>
              {g === 'none' ? 'Raw' : g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowIncome(v => !v)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${showIncome ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'}`}>Show income</button>
        <button onClick={() => setShowAdj(v => !v)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${showAdj ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'}`}>Show adjustments</button>
        <button onClick={() => setRecurringOnly(v => !v)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${recurringOnly ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'}`}>Recurring only</button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-neutral-50 p-4">
          <p className="text-[13px] text-neutral-500">Spent</p>
          <p className="text-2xl font-medium text-neutral-900">{formatUSD(-summary.spent)}</p>
        </div>
        <div className="rounded-lg bg-neutral-50 p-4">
          <p className="text-[13px] text-neutral-500">Net</p>
          <p className={`text-2xl font-medium ${summary.net < 0 ? 'text-rose-600' : summary.net > 0 ? 'text-emerald-600' : 'text-neutral-900'}`}>{formatUSD(summary.net)}</p>
        </div>
        <div className="rounded-lg bg-neutral-50 p-4">
          <p className="text-[13px] text-neutral-500">Transactions</p>
          <p className="text-2xl font-medium text-neutral-900">{summary.count}</p>
        </div>
      </div>

      {/* Grouped list or flat table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" /></div>
      ) : groupBy !== 'none' ? (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          {groups.length === 0 && incomeRows.length === 0 && adjRows.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-400">No transactions in this period.</p>
          ) : groups.map(g => (
            <div key={g.key}>
              <button onClick={() => toggleGroup(g.key)} className="sticky top-0 z-10 flex w-full items-center gap-3 border-b border-neutral-100 bg-white/90 px-4 py-2.5 backdrop-blur transition hover:bg-neutral-50">
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: g.color }} />
                <span className="text-sm font-semibold text-neutral-900">{groupBy === 'category' ? `${categoryIcon(g.label)} ${g.label}` : g.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-neutral-100 mx-2">
                  <div className="h-full rounded-full" style={{ width: `${g.share * 100}%`, background: g.color }} />
                </div>
                <span className="text-[13px] font-medium text-neutral-500">{formatUSD(-g.total)}</span>
                <span className="text-[13px] text-neutral-400">{(g.share * 100).toFixed(0)}%</span>
                <span className="text-[13px] text-neutral-400">{g.count}</span>
                {expanded.has(g.key) ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
              </button>
              {expanded.has(g.key) && (
                <div className="divide-y divide-neutral-50">
                  {g.rows.map(t => <TxnRowComp key={t.id} t={t as Txn} onEdit={openEdit} onDelete={id => setPending(id)} pending={pending} onConfirmDelete={confirmDelete} onCancelDelete={() => setPending(null)} onMarkPaid={markStatementStatus} />)}
                </div>
              )}
            </div>
          ))}

          {/* Income section (when toggled on) */}
          {incomeRows.length > 0 && (
            <div>
              <button onClick={() => toggleGroup('__income__')} className="flex w-full items-center gap-3 border-b border-neutral-100 bg-emerald-50/30 px-4 py-2.5 transition hover:bg-emerald-50/50">
                <span className="h-2.5 w-2.5 rounded-sm shrink-0 bg-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">Income / Refunds</span>
                <span className="ml-auto text-[13px] font-medium text-emerald-600">{formatUSD(incomeRows.reduce((s, t) => s + t.amountCents, 0))}</span>
                <span className="text-[13px] text-neutral-400">{incomeRows.length}</span>
                {expanded.has('__income__') ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
              </button>
              {expanded.has('__income__') && (
                <div className="divide-y divide-neutral-50">
                  {incomeRows.map(t => <TxnRowComp key={t.id} t={t as Txn} onEdit={openEdit} onDelete={id => setPending(id)} pending={pending} onConfirmDelete={confirmDelete} onCancelDelete={() => setPending(null)} onMarkPaid={markStatementStatus} />)}
                </div>
              )}
            </div>
          )}

          {/* Adjustment section (when toggled on) */}
          {adjRows.length > 0 && (
            <div>
              <button onClick={() => toggleGroup('__adj__')} className="flex w-full items-center gap-3 border-b border-neutral-100 bg-amber-50/30 px-4 py-2.5 transition hover:bg-amber-50/50">
                <span className="h-2.5 w-2.5 rounded-sm shrink-0 bg-amber-500" />
                <span className="text-sm font-semibold text-amber-700">Statement Adjustments</span>
                <span className="ml-auto text-[13px] text-neutral-400">excluded from spending</span>
                <span className="text-[13px] text-neutral-400">{adjRows.length}</span>
                {expanded.has('__adj__') ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
              </button>
              {expanded.has('__adj__') && (
                <div className="divide-y divide-neutral-50">
                  {adjRows.map(t => <TxnRowComp key={t.id} t={t as Txn} onEdit={openEdit} onDelete={id => setPending(id)} pending={pending} onConfirmDelete={confirmDelete} onCancelDelete={() => setPending(null)} onMarkPaid={markStatementStatus} />)}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          {flatRows.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-400">No transactions in this period.</p>
          ) : (
            <div className="divide-y divide-neutral-50">
              {flatRows.map(t => <TxnRowComp key={t.id} t={t as Txn} onEdit={openEdit} onDelete={id => setPending(id)} pending={pending} onConfirmDelete={confirmDelete} onCancelDelete={() => setPending(null)} onMarkPaid={markStatementStatus} showCard />)}
            </div>
          )}
        </div>
      )}

      {/* Adjustments strip */}
      {!showAdj && adjustments.length > 0 && (
        <div className="border-t border-neutral-200 pt-3">
          <button onClick={() => setShowAdj(true)} className="text-[13px] text-neutral-400 hover:text-neutral-600">
            ▸ Statement adjustments ({adjustments.length}) · excluded from spending · <span className="underline">show</span>
          </button>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" onClick={() => setShowForm(false)} onKeyDown={e => { if (e.key === 'Escape') setShowForm(false); }}>
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()} onKeyDown={handleFormKeyDown}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">{editing ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <button onClick={() => setShowForm(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FmField label="Merchant"><MerchantAutocomplete value={fmMerchant} onChange={setFmMerchant} suggestions={allMerchantNames} /></FmField>
              <FmField label="Amount">
                <div className="flex gap-1.5">
                  {(['expense', 'income'] as const).map(t => <button key={t} type="button" onClick={() => setFmTxnType(t)} className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${fmTxnType === t ? t === 'expense' ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{t === 'expense' ? '− Expense' : '+ Income / Refund'}</button>)}
                </div>
                <input value={fmAmount} onChange={e => setFmAmount(e.target.value)} inputMode="decimal" placeholder="12.50" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
              </FmField>
              <FmField label="Date"><CalendarPicker value={fmDate} onChange={setFmDate} notices={calendarNotices} /></FmField>
              <FmField label="Card"><ModalDropdown value={fmCard} placeholder="Select card…" options={getSortedCards(cards).map(c => ({ value: c.id, label: `${c.name} •••• ${c.last4}` }))} onChange={setFmCard} /></FmField>
              {fmTxnType === 'expense' ? <FmField label="Category"><CategoryPickerModal value={fmCat} onChange={setFmCat} /></FmField> : <FmField label="Category"><span className="block h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">Income</span></FmField>}
              <FmField label="Notes (optional)"><input value={fmNotes} onChange={e => setFmNotes(e.target.value)} placeholder="Optional" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></FmField>
            </div>
            {!editing && <div className="mt-4"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={fmRecurring} onChange={e => { setFmRecurring(e.target.checked); if (e.target.checked && !fmRecurDay && fmDate) setFmRecurDay(String(parseInt(fmDate.split('-')[2], 10))); }} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /><span className="text-sm font-semibold text-slate-700">🔁 Recurring</span></label>
              {fmRecurring && <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-xl bg-slate-50 p-4">
                <FmField label="Frequency"><select value={fmRecurFreq} onChange={e => setFmRecurFreq(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></FmField>
                <FmField label="Day"><input type="number" min={1} max={31} value={fmRecurDay} onChange={e => setFmRecurDay(e.target.value)} placeholder={fmDate.split('-')[2] || '15'} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none" /></FmField>
                <FmField label="End date"><CalendarPicker value={fmRecurEnd} onChange={setFmRecurEnd} placeholder="No end" openUp /></FmField>
              </div>}
            </div>}
            {formErr && <p className="mt-3 text-xs text-rose-600">{formErr}</p>}
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500"><Keyboard className="h-4 w-4" />Enter to save</div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}<span className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs">Enter</span></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="fixed right-8 top-8 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl"><div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600"><Check className="h-4 w-4" /></div><div><p className="text-sm font-bold">Success</p><p className="text-xs text-slate-500">{toast}</p></div></div>}
    </div>
  );
}

/* ── Transaction row component ───────────────────────────── */
function TxnRowComp({ t, onEdit, onDelete, pending, onConfirmDelete, onCancelDelete, onMarkPaid, showCard }: {
  t: Txn; onEdit: (t: Txn) => void; onDelete: (id: string) => void; pending: string | null;
  onConfirmDelete: (id: string) => void; onCancelDelete: () => void;
  onMarkPaid: (sbId: string, status: string, paidDate: string | null) => void;
  showCard?: boolean;
}) {
  const kind = kindOf(t as TxnRow);
  const upcoming = isUpcoming(t as TxnRow);

  if (t.id === pending) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-rose-50/50">
        <span className="text-[13px]">Delete <span className="font-medium">{t.merchant}</span> ({formatUSD(t.amountCents)})?</span>
        <div className="flex gap-2">
          <button onClick={onCancelDelete} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Cancel</button>
          <button onClick={() => onConfirmDelete(t.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-[13px] transition hover:bg-neutral-50/50 ${kind === 'adjustment' ? 'bg-amber-50/30' : ''} ${upcoming ? 'opacity-50' : ''}`}>
      <span className="w-12 shrink-0 text-neutral-500">{t.date.slice(5)}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-neutral-900">
        {kind === 'adjustment' ? `${t.card.name} •••• ${t.card.last4}` : t.merchant}
        {kind === 'adjustment' && <span className="ml-1 text-xs text-neutral-400">Stmt {t.statementTotalCents != null ? formatUSD(t.statementTotalCents) : ''}</span>}
        {upcoming && <span className="ml-1 text-xs text-sky-600 bg-sky-50 px-1 py-0.5 rounded-md">Upcoming</span>}
        {t.recurringRuleId && <span className="ml-1 text-xs text-violet-600 bg-violet-50 px-1 py-0.5 rounded-md">recurring</span>}
        {kind === 'adjustment' && (
          t.paymentStatus === 'paid'
            ? <span className="ml-1 bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-md text-[11px] font-bold">Paid{t.paidDate ? ` ${t.paidDate.slice(5)}` : ''}</span>
            : <span className="ml-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md text-[11px] font-bold">Pending</span>
        )}
      </span>
      {showCard && kind !== 'adjustment' && <span className="shrink-0 text-xs text-neutral-400 truncate max-w-[120px]">{t.card.name} •••• {t.card.last4}</span>}
      <span className="shrink-0 text-xs text-neutral-500">{categoryIcon(t.category)} {t.category}</span>
      <span className={`shrink-0 w-24 text-right font-semibold ${upcoming ? 'text-neutral-400' : t.amountCents < 0 ? 'text-rose-600' : t.amountCents > 0 ? 'text-emerald-600' : ''}`}>{formatUSD(t.amountCents)}</span>
      <span className="shrink-0 w-16 text-right">
        {t.isStatementAdjustment && t.statementBalanceId ? (
          t.paymentStatus === 'paid'
            ? <button onClick={() => onMarkPaid(t.statementBalanceId!, 'pending', null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700">Undo</button>
            : <button onClick={() => onMarkPaid(t.statementBalanceId!, 'paid', todayYMD())} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">Mark paid</button>
        ) : (
          <span className="inline-flex gap-1 text-neutral-400">
            <button onClick={() => onEdit(t)} className="rounded p-1 hover:bg-neutral-100 hover:text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={() => onDelete(t.id)} className="rounded p-1 hover:bg-neutral-100 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
          </span>
        )}
      </span>
    </div>
  );
}

function FmField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}
