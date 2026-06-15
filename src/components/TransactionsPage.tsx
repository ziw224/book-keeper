'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { ListChecks, Plus, ArrowUp, ArrowDown, Pencil, Trash2, ChevronDown, ChevronRight, Check, Keyboard, X, Calendar, Tag, Search } from 'lucide-react';
import { formatUSD, toCents } from '@/lib/money';
import { SUGGESTED_CATEGORIES, categoryColor, categoryIcon, getAllCategories, addCustomCategory } from '@/lib/categories';
import type { StatementCycle } from '@/lib/cycle';
import CalendarPicker, { CalendarNotice } from '@/components/CalendarPicker';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Card { id: string; name: string; issuer: string; last4: string; type: string; statementCloseDay: number | null; }
interface Txn {
  id: string; cardId: string; date: string; merchant: string; amountCents: number;
  category: string; notes?: string | null; cycleKey: string | null; cycleLabel: string | null;
  recurringRuleId?: string | null; isRecurringGenerated?: boolean;
  card: { id: string; name: string; type: string; statementCloseDay: number | null };
}
type SortKey = 'date' | 'amt' | 'cat';

async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { headers: init.body ? { 'Content-Type': 'application/json' } : undefined, ...init });
  if (!res.ok) { let msg = `Request failed (${res.status})`; try { const b = await res.json(); if (b?.error) msg = typeof b.error === 'string' ? b.error : JSON.stringify(b.error); } catch {} throw new Error(msg); }
  return res.status === 204 ? (undefined as T) : res.json();
}

const todayYMD = () => new Date().toISOString().slice(0, 10);
const pad2 = (n: number) => String(n).padStart(2, '0');
const centsToInput = (c: number) => (c / 100).toFixed(2);
function calendarMonth(dateStr: string) {
  const [, m] = dateStr.split('-').map(Number);
  return MONTHS[m - 1];
}

const RECENT_CARD_KEY = 'cardcycle_recent_card_ids';
function rememberCard(cardId: string) {
  try {
    const existing = JSON.parse(localStorage.getItem(RECENT_CARD_KEY) || '[]');
    const next = [cardId, ...existing.filter((id: string) => id !== cardId)].slice(0, 10);
    localStorage.setItem(RECENT_CARD_KEY, JSON.stringify(next));
  } catch {}
}
function getSortedCards(allCards: Card[]): Card[] {
  try {
    const recentIds: string[] = JSON.parse(localStorage.getItem(RECENT_CARD_KEY) || '[]');
    return [...allCards].sort((a, b) => {
      const ai = recentIds.indexOf(a.id), bi = recentIds.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  } catch { return allCards; }
}

/* ── Inline dropdown for modal forms ─────────────────────── */

function ModalDropdown({ value, label, options, onChange, placeholder }: {
  value: string; label: string;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const display = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm transition ${
          open ? 'border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {display?.icon}
          <span className={display ? '' : 'text-slate-400'}>{display?.label || placeholder || 'Select…'}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[60] max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${value === o.value ? 'font-semibold text-indigo-600' : 'text-slate-700'}`}
            >
              {o.icon}
              <span className="truncate">{o.label}</span>
              {value === o.value && <Check className="ml-auto h-4 w-4 shrink-0 text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Reusable dropdown ────────────────────────────────────── */

function Dropdown({ value, label, options, onChange, icon: Icon, disabled, placeholder }: {
  value: string; label: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; icon: React.ElementType; disabled?: boolean; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-[180px]">
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-expanded={open}
        className={`flex h-12 w-full items-center justify-between rounded-xl border bg-white px-4 text-left text-sm font-semibold shadow-sm transition ${
          disabled ? 'opacity-40 cursor-not-allowed' :
          open ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate">{label || placeholder}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                value === o.value ? 'font-semibold text-indigo-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{o.label}</span>
              {value === o.value && <Check className="h-4 w-4 text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Category dropdown with search ─────────────────────── */

function CategoryDropdown({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const allIds = getAllCategories();
  const allSelected = allIds.length > 0 && allIds.every(id => selected.includes(id));
  const noneSelected = selected.length === 0;

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  function toggleAll() {
    if (allSelected) onChange([]);
    else onChange([...allIds]);
  }

  function toggleOne(id: string) {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id));
    else onChange([...selected, id]);
  }

  const filtered = allIds.filter(c => c.toLowerCase().includes(query.toLowerCase()));

  const displayLabel = allSelected ? 'All categories'
    : noneSelected ? 'No categories selected'
    : selected.length <= 2 ? selected.join(', ')
    : `${selected.length} categories`;

  return (
    <div ref={ref} className="relative min-w-[220px]">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`flex h-12 w-full items-center justify-between rounded-xl border bg-white px-4 text-left text-sm font-semibold shadow-sm transition ${
          open ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Tag className="h-4 w-4 shrink-0 text-slate-500" />
          <span className={`truncate ${noneSelected ? 'text-slate-400' : ''}`}>{displayLabel}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-auto p-1">
            {/* All categories toggle */}
            <button
              onClick={toggleAll}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${allSelected ? 'font-semibold text-indigo-600' : 'text-slate-700'}`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded border text-white ${allSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                {allSelected && <Check className="h-3 w-3" />}
              </span>
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <span>All categories</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            {filtered.map(cat => {
              const checked = selected.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleOne(cat)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${checked ? 'font-semibold text-indigo-600' : 'text-slate-700'}`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded border text-white ${checked ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="text-sm">{categoryIcon(cat)}</span>
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Category picker with custom emoji support ───────────── */

function CategoryPickerModal({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newIcon, setNewIcon] = useState('');
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); setCreating(false); } }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const allCats = getAllCategories();
  const filtered = allCats.filter(c => c.toLowerCase().includes(query.toLowerCase()));
  const display = value ? `${categoryIcon(value)} ${value}` : '';

  function handleCreate() {
    const name = newName.trim();
    const icon = newIcon.trim() || '📌';
    if (!name) return;
    addCustomCategory(name, icon);
    onChange(name);
    setCreating(false);
    setNewIcon('');
    setNewName('');
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm transition ${
          open ? 'border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200'
        }`}
      >
        <span className={display ? '' : 'text-slate-400'}>{display || 'Select category…'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 bottom-[calc(100%+6px)] z-[60] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-auto p-1">
            {filtered.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => { onChange(cat); setOpen(false); setQuery(''); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${value === cat ? 'font-semibold text-indigo-600' : 'text-slate-700'}`}
              >
                <span className="text-sm">{categoryIcon(cat)}</span>
                <span className="truncate">{cat}</span>
                {value === cat && <Check className="ml-auto h-4 w-4 shrink-0 text-indigo-600" />}
              </button>
            ))}
            {query && !filtered.length && (
              <p className="px-3 py-2 text-xs text-slate-400">No match — create a custom category below</p>
            )}

            {/* Create custom category — inside scroll area */}
            <div className="mt-1 border-t border-slate-100 pt-1">
              {!creating ? (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
                >
                  <Plus className="h-4 w-4" />
                  Create custom category
                </button>
              ) : (
                <div className="p-2 space-y-2">
                  <p className="text-xs font-semibold text-slate-500">New category</p>
                  <div className="flex gap-2">
                    <input
                      value={newIcon}
                      onChange={e => setNewIcon(e.target.value)}
                      placeholder="😀"
                      className="h-9 w-12 rounded-lg border border-slate-200 text-center text-lg outline-none focus:border-indigo-400"
                      maxLength={4}
                    />
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Category name"
                      className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleCreate(); } }}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleCreate} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">Add</button>
                    <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */

export default function TransactionsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [cycles, setCycles] = useState<StatementCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fCard, setFCard] = useState('');
  const [fCycle, setFCycle] = useState('');
  const [fCats, setFCats] = useState<string[]>([...SUGGESTED_CATEGORIES]);
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
  const [fmRecurring, setFmRecurring] = useState(false);
  const [fmRecurFreq, setFmRecurFreq] = useState('monthly');
  const [fmRecurDay, setFmRecurDay] = useState('');
  const [fmRecurEnd, setFmRecurEnd] = useState('');
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

  useEffect(() => {
    apiFetch<Card[]>('/api/cards').then(setCards).catch(() => setError('Could not load cards.'));
    apiFetch('/api/recurring', { method: 'POST' }).catch(() => {});
  }, []);

  const selectedCardIsDebit = useMemo(() => {
    if (!fCard) return false;
    return cards.find(c => c.id === fCard)?.type === 'debit';
  }, [fCard, cards]);

  useEffect(() => {
    setFCycle('');
    if (!fCard || selectedCardIsDebit) { setCycles([]); return; }
    apiFetch<StatementCycle[]>(`/api/cards/${fCard}/cycles?count=12`).then(setCycles).catch(() => setCycles([]));
  }, [fCard, selectedCardIsDebit]);

  const fetchTxns = useCallback(() => {
    const params = new URLSearchParams();
    if (fCard) params.set('cardId', fCard);
    if (fCard && fCycle && !selectedCardIsDebit) params.set('cycle', fCycle);
    if (fFrom) params.set('from', fFrom);
    if (fTo) params.set('to', fTo);
    setLoading(true);
    apiFetch<Txn[]>(`/api/transactions?${params.toString()}`)
      .then(d => { setTxns(d); setError(null); })
      .catch(() => setError('Could not load transactions.'))
      .finally(() => setLoading(false));
  }, [fCard, fCycle, fFrom, fTo, selectedCardIsDebit]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  const allCatsSelected = SUGGESTED_CATEGORIES.length > 0 && (SUGGESTED_CATEGORIES as unknown as string[]).every(c => fCats.includes(c));
  const noCatsSelected = fCats.length === 0;

  const sorted = useMemo(() => {
    const filtered = noCatsSelected ? [] : allCatsSelected ? txns : txns.filter(t => fCats.includes(t.category));
    return [...filtered].sort((a, b) => {
      const x = sortKey === 'date' ? a.date.localeCompare(b.date) : sortKey === 'cat' ? a.category.localeCompare(b.category) : a.amountCents - b.amountCents;
      return x * sortDir;
    });
  }, [txns, sortKey, sortDir, fCats, allCatsSelected, noCatsSelected]);

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

  async function showAllDates() {
    try {
      const all = await apiFetch<Txn[]>('/api/transactions');
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
    setFmCat(''); setFmNotes(''); setFormErr('');
    setFmRecurring(false); setFmRecurFreq('monthly'); setFmRecurDay(''); setFmRecurEnd('');
    const sorted = getSortedCards(cards);
    setFmCard(fCard || sorted[0]?.id || '');
    setShowForm(true);
  }
  function openEdit(t: Txn) {
    setEditing(t.id); setFmDate(t.date); setFmMerchant(t.merchant); setFmAmount(centsToInput(t.amountCents));
    setFmCat(t.category); setFmCard(t.cardId); setFmNotes(t.notes ?? ''); setFormErr('');
    setFmRecurring(false); setFmRecurFreq('monthly'); setFmRecurDay(''); setFmRecurEnd('');
    setShowForm(true);
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
      const payload: Record<string, unknown> = { cardId: fmCard, date: fmDate, merchant: fmMerchant.trim(), amountCents, category: fmCat.trim(), notes: fmNotes.trim() || null };
      if (fmRecurring && !editing) {
        payload.recurring = true;
        payload.recurringFrequency = fmRecurFreq;
        payload.recurringDay = fmRecurDay ? parseInt(fmRecurDay, 10) : parseInt(fmDate.split('-')[2], 10);
        if (fmRecurEnd) payload.recurringEndDate = fmRecurEnd;
      }
      const body = JSON.stringify(payload);
      if (editing) await apiFetch(`/api/transactions/${editing}`, { method: 'PATCH', body });
      else await apiFetch('/api/transactions', { method: 'POST', body });
      rememberCard(fmCard);
      setShowForm(false);
      showToast(`Transaction ${editing ? 'updated' : 'saved'} — ${fmMerchant.trim()} ${formatUSD(amountCents)}`);
      fetchTxns();
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
    try { await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' }); setPending(null); showToast('Transaction deleted'); fetchTxns(); }
    catch { setError('Could not delete.'); }
  }

  function periodLabel(t: Txn) {
    if (t.cycleLabel) return t.cycleLabel.replace(/ 20\d\d$/, '');
    return calendarMonth(t.date);
  }

  // Cycle dropdown options
  const cycleOptions = [
    { value: '', label: selectedCardIsDebit ? 'N/A (debit)' : fCard ? 'All cycles' : 'Cycle (pick a card)' },
    ...cycles.map(c => ({ value: c.key, label: c.label })),
  ];

  // Calendar notices (paycheck + statement close days)
  const calendarNotices = useMemo(() => {
    const out: CalendarNotice[] = [];
    const now = new Date();
    for (let offset = -2; offset <= 2; offset++) {
      const y = now.getFullYear(), m = now.getMonth() + offset;
      const dt = new Date(y, m, 15);
      out.push({ date: `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-15`, label: 'Paycheck', color: '#10b981' });
      const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
      out.push({ date: `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`, label: 'Paycheck', color: '#10b981' });
    }
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
        <td className="px-5 py-3.5 text-sm font-semibold">
          {t.merchant}
          {t.recurringRuleId && <span className="ml-1.5 text-xs" title="Recurring">🔁</span>}
        </td>
        <td className="px-5 py-3.5 text-sm">
          <span className="mr-1">{categoryIcon(t.category)}</span>
          {t.category}
        </td>
        <td className="px-5 py-3.5 text-sm">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">{periodLabel(t)}</span>
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
          <col className="w-[15%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[27%]" />
          <col className="w-14" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-100">
            <SortTh onClick={() => toggleSort('date')} active={sortKey === 'date'} dir={sortDir}>Date</SortTh>
            <th className={thCls}>Merchant</th>
            <SortTh onClick={() => toggleSort('cat')} active={sortKey === 'cat'} dir={sortDir}>Category</SortTh>
            <th className={thCls}>Period</th>
            <SortTh onClick={() => toggleSort('amt')} active={sortKey === 'amt'} dir={sortDir} align="right">Amount</SortTh>
            <th className={thCls}>Notes</th>
            <th className={thCls} />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">{noCatsSelected ? 'No categories selected.' : 'No transactions match these filters.'}</td></tr>
          ) : rows.map(renderRow)}
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-3">
      {/* Floating add button */}
      <button
        onClick={openAdd}
        className="group fixed right-8 top-28 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all duration-200 hover:w-48 hover:px-5"
      >
        <Plus className="h-5 w-5 shrink-0" />
        <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover:ml-2 group-hover:max-w-36 group-hover:opacity-100">
          Add Transaction
        </span>
      </button>

      {/* Card tabs */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex overflow-x-auto p-2">
          <button
            onClick={() => setFCard('')}
            className={`group relative flex min-w-fit items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${!fCard ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
          >
            {!fCard && <Check className="h-4 w-4" />}
            All Cards
            <span className="text-slate-400">({txns.length})</span>
          </button>
          {cards.map(c => {
            const active = fCard === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFCard(c.id)}
                className={`group relative flex min-w-fit items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
              >
                {active && <Check className="h-4 w-4" />}
                {c.name}
                <span className="font-medium text-slate-400">•••• {c.last4}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Dropdown
            value={fCycle}
            label={cycles.find(c => c.key === fCycle)?.label || cycleOptions[0].label}
            options={cycleOptions}
            onChange={setFCycle}
            icon={Calendar}
            disabled={!fCard || selectedCardIsDebit}
          />

          <CategoryDropdown selected={fCats} onChange={setFCats} />

          <div className="flex items-center gap-3">
            <div className="w-44">
              <CalendarPicker value={fFrom} onChange={setFFrom} notices={calendarNotices} placeholder="Start date" />
            </div>
            <span className="text-slate-400">–</span>
            <div className="w-44">
              <CalendarPicker value={fTo} onChange={setFTo} notices={calendarNotices} placeholder="End date" />
            </div>
          </div>

          <button onClick={showAllDates} className={quickBtnCls}>All time</button>
          <button onClick={showThisMonth} className={quickBtnCls}>This month</button>
        </div>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Add/Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"
          onClick={() => setShowForm(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowForm(false); }}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
            onKeyDown={handleFormKeyDown}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">{editing ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <button onClick={() => setShowForm(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FmField label="Merchant"><input value={fmMerchant} onChange={e => setFmMerchant(e.target.value)} placeholder="e.g. Whole Foods" className={fmInputCls} autoFocus /></FmField>
              <FmField label="Amount (negative for refund)"><input value={fmAmount} onChange={e => setFmAmount(e.target.value)} inputMode="decimal" placeholder="12.50 or 10+5.99" className={fmInputCls} /></FmField>
              <FmField label="Date"><CalendarPicker value={fmDate} onChange={setFmDate} notices={calendarNotices} /></FmField>
              <FmField label="Card">
                <ModalDropdown
                  value={fmCard}
                  label="Card"
                  placeholder="Select card…"
                  options={getSortedCards(cards).map(c => ({ value: c.id, label: `${c.name} •••• ${c.last4}` }))}
                  onChange={setFmCard}
                />
              </FmField>
              <FmField label="Category">
                <CategoryPickerModal value={fmCat} onChange={setFmCat} />
              </FmField>
              <FmField label="Notes (optional)"><input value={fmNotes} onChange={e => setFmNotes(e.target.value)} placeholder="Optional notes" className={fmInputCls} /></FmField>
            </div>

            {/* Recurring toggle */}
            {!editing && (
              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={fmRecurring} onChange={e => setFmRecurring(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                  <span className="text-sm font-semibold text-slate-700">🔁 Recurring transaction</span>
                </label>
                {fmRecurring && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-xl bg-slate-50 p-4">
                    <FmField label="Frequency">
                      <select value={fmRecurFreq} onChange={e => setFmRecurFreq(e.target.value)} className={fmInputCls}>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </FmField>
                    <FmField label="Recurring day">
                      <input type="number" min={1} max={31} value={fmRecurDay} onChange={e => setFmRecurDay(e.target.value)} placeholder={fmDate.split('-')[2] || '15'} className={fmInputCls} />
                    </FmField>
                    <FmField label="End date (optional)">
                      <CalendarPicker value={fmRecurEnd} onChange={setFmRecurEnd} placeholder="No end date" />
                    </FmField>
                  </div>
                )}
              </div>
            )}

            {formErr && <p className="mt-3 text-xs text-rose-600">{formErr}</p>}
            <div className="mt-6 flex items-center justify-between">
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
        </div>
      )}

      <p className="text-sm font-medium text-slate-500">
        {loading ? 'Loading…' : `Showing ${sorted.length} transaction${sorted.length === 1 ? '' : 's'} · ${formatUSD(net)} net`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
        <div className="fixed right-8 top-8 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl">
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

const quickBtnCls = 'h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm hover:bg-slate-50 transition';
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
