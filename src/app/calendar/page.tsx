'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Check } from 'lucide-react';
import { formatUSD, toCents } from '@/lib/money';
import { categoryColor, categoryIcon, SUGGESTED_CATEGORIES, getAllCategories, addCustomCategory } from '@/lib/categories';
import { kindOf, isUpcoming, type TxnRow } from '@/lib/txn';

interface Txn extends TxnRow {
  cardId: string;
  card: { id: string; name: string; last4: string; type: string; statementCloseDay: number | null };
  notes?: string | null;
}
interface Card { id: string; name: string; last4: string; type: string; }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const pad = (n: number) => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m+1)}-${pad(d)}`;

function buildCells(year: number, monthIdx: number) {
  const firstDow = new Date(year, monthIdx, 1).getDay();
  const dim = new Date(year, monthIdx + 1, 0).getDate();
  const prevDim = new Date(year, monthIdx, 0).getDate();
  const cells: { day: number; key: string; muted: boolean }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) { const d = prevDim - i; cells.push({ day: d, key: dateKey(year, monthIdx - 1, d), muted: true }); }
  for (let d = 1; d <= dim; d++) cells.push({ day: d, key: dateKey(year, monthIdx, d), muted: false });
  let nd = 1;
  while (cells.length < 42) { cells.push({ day: nd, key: dateKey(year, monthIdx + 1, nd), muted: true }); nd++; }
  return cells;
}

function QuickCatPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newIcon, setNewIcon] = useState('');
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCreating(false); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const allCats = getAllCategories();

  return (
    <div ref={ref} className="relative w-32 min-w-0 shrink-0">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex h-9 w-full items-center gap-1 rounded-lg border border-neutral-200 px-1.5 text-xs outline-none hover:border-neutral-300 truncate">
        <span>{categoryIcon(value)}</span>
        <span className="truncate">{value || 'Category'}</span>
        <ChevronRight className={`ml-auto h-3 w-3 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 bottom-[calc(100%+4px)] z-[60] w-48 max-h-56 overflow-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-xl">
          {allCats.map(c => (
            <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-neutral-50 ${value === c ? 'font-semibold text-indigo-600' : 'text-neutral-700'}`}>
              <span>{categoryIcon(c)}</span>{c}
            </button>
          ))}
          <div className="border-t border-neutral-100 mt-1 pt-1">
            {!creating ? (
              <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
                <Plus className="h-3 w-3" /> Custom
              </button>
            ) : (
              <div className="p-1.5 space-y-1.5">
                <div className="flex gap-1.5">
                  <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="😀" className="h-7 w-9 rounded border border-neutral-200 text-center text-sm outline-none" maxLength={4} autoFocus />
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="h-7 flex-1 min-w-0 rounded border border-neutral-200 px-2 text-xs outline-none"
                    onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { e.preventDefault(); e.stopPropagation(); addCustomCategory(newName.trim(), newIcon.trim() || '📌'); onChange(newName.trim()); setCreating(false); setNewIcon(''); setNewName(''); setOpen(false); } }} />
                </div>
                <button type="button" onClick={() => { if (!newName.trim()) return; addCustomCategory(newName.trim(), newIcon.trim() || '📌'); onChange(newName.trim()); setCreating(false); setNewIcon(''); setNewName(''); setOpen(false); }} className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white">Add</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const today = todayKey();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [txns, setTxns] = useState<Txn[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showQuick, setShowQuick] = useState(false);
  const [quickDate, setQuickDate] = useState(today);
  const [quickMode, setQuickMode] = useState<'expense' | 'income'>('expense');
  const [quickRows, setQuickRows] = useState<{ merchant: string; amount: string; category: string; cardId: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(msg: string) { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2500); }

  // Fetch transactions for the visible month
  useEffect(() => {
    const from = `${viewYear}-${pad(viewMonth + 1)}-01`;
    const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
    const to = `${viewYear}-${pad(viewMonth + 1)}-${pad(dim)}`;
    fetch(`/api/transactions?from=${from}&to=${to}`).then(r => r.json()).then(setTxns).catch(() => {});
  }, [viewYear, viewMonth, toast]);

  useEffect(() => { fetch('/api/cards').then(r => r.json()).then(setCards).catch(() => {}); }, []);

  const cells = useMemo(() => buildCells(viewYear, viewMonth), [viewYear, viewMonth]);

  // Group expenses by date (exclude adjustments and upcoming)
  const dailySpend = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txns) {
      if (t.isStatementAdjustment) continue;
      if (isUpcoming(t as TxnRow)) continue;
      if (kindOf(t as TxnRow) !== 'expense') continue;
      map.set(t.date, (map.get(t.date) || 0) + (-t.amountCents));
    }
    return map;
  }, [txns]);

  const maxDaily = useMemo(() => Math.max(...dailySpend.values(), 1), [dailySpend]);

  // Group all transactions by date for hover detail
  const txnsByDate = useMemo(() => {
    const map = new Map<string, Txn[]>();
    for (const t of txns) {
      const arr = map.get(t.date) || [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return map;
  }, [txns]);

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }

  function openQuickAdd(date?: string) {
    setQuickDate(date || today);
    setQuickMode('expense');
    setQuickRows([{ merchant: '', amount: '', category: SUGGESTED_CATEGORIES[0], cardId: cards[0]?.id || '' }]);
    setShowQuick(true);
  }

  function addQuickRow() {
    setQuickRows(prev => [...prev, { merchant: '', amount: '', category: SUGGESTED_CATEGORIES[0], cardId: prev[prev.length - 1]?.cardId || cards[0]?.id || '' }]);
  }

  function updateQuickRow(idx: number, field: string, value: string) {
    setQuickRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function removeQuickRow(idx: number) {
    setQuickRows(prev => prev.filter((_, i) => i !== idx));
  }

  async function saveAll() {
    const valid = quickRows.filter(r => r.merchant.trim() && r.amount.trim() && (quickMode === 'income' || r.cardId));
    if (valid.length === 0) return;
    setSaving(true);
    let count = 0;
    for (const row of valid) {
      try {
        const raw = Math.abs(toCents(row.amount));
        const amountCents = quickMode === 'expense' ? -raw : raw;
        const cardId = quickMode === 'income' ? (row.cardId || cards.find(c => c.type === 'debit')?.id || cards[0]?.id) : row.cardId;
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId, date: quickDate, merchant: row.merchant.trim(), amountCents, category: quickMode === 'income' ? 'Income' : row.category, notes: null }),
        });
        count++;
      } catch {}
    }
    setSaving(false);
    setShowQuick(false);
    showToast(`${count} transaction${count === 1 ? '' : 's'} saved`);
  }

  const hoveredTxns = hovered ? txnsByDate.get(hovered) || [] : [];

  return (
    <div>
      {/* Month header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{MONTH_NAMES[viewMonth]} {viewYear}</h1>
          <p className="mt-1 text-sm text-neutral-500">Daily spending overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openQuickAdd()} className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 transition">
            <Plus className="h-4 w-4" /> Add today&apos;s spending
          </button>
          <button onClick={prevMonth} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={nextMonth} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-neutral-100">
          {WEEKDAYS.map(d => <div key={d} className="py-2 text-center text-xs font-semibold text-neutral-400">{d}</div>)}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {cells.map(cell => {
            const isToday = cell.key === today;
            const future = cell.key > today;
            const spend = dailySpend.get(cell.key) || 0;
            const intensity = spend > 0 ? Math.max(0.15, Math.min(1, spend / maxDaily)) : 0;
            const dayTxns = txnsByDate.get(cell.key) || [];
            const isHovered = hovered === cell.key;

            return (
              <div
                key={cell.key}
                className={`relative min-h-[90px] border-b border-r border-neutral-100 p-1.5 transition ${cell.muted ? 'bg-neutral-50' : ''} ${future && !cell.muted ? 'opacity-40' : ''} ${isHovered ? 'ring-2 ring-inset ring-indigo-400' : ''}`}
                onMouseEnter={() => setHovered(cell.key)}
                onMouseLeave={() => setHovered(null)}
                onContextMenu={e => { e.preventDefault(); openQuickAdd(cell.key); }}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white' : cell.muted ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    {cell.day}
                  </span>
                  {spend > 0 && !cell.muted && (
                    <span className="text-[10px] font-bold text-neutral-600">{formatUSD(-spend)}</span>
                  )}
                </div>

                {/* Heat bar */}
                {intensity > 0 && !cell.muted && (
                  <div className="mt-1 h-1 rounded-full bg-neutral-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${intensity * 100}%`, background: `rgba(239, 68, 68, ${intensity})` }} />
                  </div>
                )}

                {/* Transaction dots */}
                {dayTxns.length > 0 && !cell.muted && (
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {dayTxns.slice(0, 5).map(t => (
                      <span key={t.id} className="h-1.5 w-1.5 rounded-full" style={{ background: categoryColor(t.category) }} />
                    ))}
                    {dayTxns.length > 5 && <span className="text-[8px] text-neutral-400">+{dayTxns.length - 5}</span>}
                  </div>
                )}

                {/* Hover popup */}
                {isHovered && dayTxns.length > 0 && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl" onMouseEnter={() => setHovered(cell.key)} onMouseLeave={() => setHovered(null)}>
                    <p className="mb-2 text-xs font-bold text-neutral-500">{cell.key}</p>
                    <div className="space-y-1.5 max-h-48 overflow-auto">
                      {dayTxns.map(t => (
                        <div key={t.id} className="flex items-center gap-2 text-xs">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: categoryColor(t.category) }} />
                          <span className="flex-1 truncate font-medium">{t.merchant}</span>
                          <span className={`shrink-0 font-semibold ${t.amountCents < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatUSD(t.amountCents)}</span>
                        </div>
                      ))}
                    </div>
                    {spend > 0 && <div className="mt-2 border-t border-neutral-100 pt-1.5 text-xs font-bold text-neutral-700">Spent: {formatUSD(-spend)}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick add modal */}
      {showQuick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-4" onClick={() => setShowQuick(false)}>
          <div className="w-full max-w-3xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Add transaction</h2>
                <p className="text-xs text-neutral-500">{quickDate}{quickDate === today ? ' (today)' : ''}</p>
              </div>
              <button onClick={() => setShowQuick(false)} className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
            </div>

            {/* Expense / Income tabs */}
            <div className="mb-4 inline-flex rounded-lg bg-neutral-100 p-0.5">
              <button onClick={() => setQuickMode('expense')} className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${quickMode === 'expense' ? 'bg-white shadow-sm text-rose-600' : 'text-neutral-600 hover:text-neutral-900'}`}>− Expense</button>
              <button onClick={() => setQuickMode('income')} className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${quickMode === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-600 hover:text-neutral-900'}`}>+ Income</button>
            </div>

            <div className="space-y-2">
              {quickRows.map((row, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <input value={row.merchant} onChange={e => updateQuickRow(idx, 'merchant', e.target.value)} placeholder="Merchant" className="h-9 min-w-0 flex-1 basis-40 rounded-lg border border-neutral-200 px-2.5 text-sm outline-none focus:border-indigo-400" />
                  <input value={row.amount} onChange={e => updateQuickRow(idx, 'amount', e.target.value)} placeholder={quickMode === 'expense' ? '12.50' : '3000'} inputMode="decimal" className="h-9 w-24 min-w-0 shrink-0 rounded-lg border border-neutral-200 px-2.5 text-sm outline-none focus:border-indigo-400" />
                  {quickMode === 'expense' && <QuickCatPicker value={row.category} onChange={v => updateQuickRow(idx, 'category', v)} />}
                  {quickMode === 'expense' && (
                    <select value={row.cardId} onChange={e => updateQuickRow(idx, 'cardId', e.target.value)} className="h-9 w-36 min-w-0 shrink-0 rounded-lg border border-neutral-200 px-1.5 text-xs outline-none truncate">
                      {cards.map(c => <option key={c.id} value={c.id}>{c.name} •• {c.last4}</option>)}
                    </select>
                  )}
                  {quickRows.length > 1 && <button onClick={() => removeQuickRow(idx)} className="shrink-0 rounded p-1 text-neutral-400 hover:text-rose-600"><X className="h-4 w-4" /></button>}
                </div>
              ))}
            </div>

            <button onClick={addQuickRow} className="mt-2 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              <Plus className="h-3.5 w-3.5" /> Add another row
            </button>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowQuick(false)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold hover:bg-neutral-50">Cancel</button>
              <button onClick={saveAll} disabled={saving} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50">
                {saving ? 'Saving…' : `Save all (${quickRows.filter(r => r.merchant.trim() && r.amount.trim()).length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="fixed right-8 top-8 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl"><div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600"><Check className="h-4 w-4" /></div><div><p className="text-sm font-bold">Success</p><p className="text-xs text-neutral-500">{toast}</p></div></div>}
    </div>
  );
}
