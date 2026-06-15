'use client';

/**
 * CardCycle — Cards page (task T6: cards/page.tsx + CardForm).
 *
 * Self-contained client component; wire app/cards/page.tsx to render <CardsPage />.
 * Consolidates the list + add/edit form + delete confirmation into one file for
 * a clean MVP (split CardForm out later if it grows).
 *
 * API (all money in CENTS):
 *   GET    /api/cards
 *   POST   /api/cards
 *   PATCH  /api/cards/:id
 *   DELETE /api/cards/:id
 *   GET    /api/summary?cardId&cycle=YYYY-MM     (per-card current-cycle spend)
 *   GET    /api/transactions?cardId              (count, for delete confirmation)
 *
 * Libs: formatUSD (@/lib/money), getCycleForDate (@/lib/cycle).
 * Icons: lucide-react (ships with shadcn/ui).
 */

import { useEffect, useState } from 'react';
import { CreditCard, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { formatUSD } from '@/lib/money';
import { getCycleForDate } from '@/lib/cycle';

interface Card {
  id: string;
  name: string;
  issuer: string;
  last4: string;
  statementCloseDay: number;
}

const AVATAR_PALETTE: [string, string][] = [
  ['#E6F1FB', '#0C447C'],
  ['#FAEEDA', '#633806'],
  ['#E1F5EE', '#085041'],
  ['#EEEDFE', '#3C3489'],
  ['#FBEAF0', '#72243E'],
];

const ordinal = (d: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = d % 100;
  return d + (s[(v - 20) % 10] || s[v] || s[0]);
};
const todayYMD = () => new Date().toISOString().slice(0, 10);

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

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [spend, setSpend] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [last4, setLast4] = useState('');
  const [close, setClose] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [pending, setPending] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  async function load() {
    try {
      const data = await api<Card[]>('/api/cards');
      setCards(data);
      setLoading(false);
      const today = todayYMD();
      const entries = await Promise.all(
        data.map(async (c) => {
          try {
            const key = getCycleForDate(today, c.statementCloseDay).key;
            const s = await api<{ total: number }>(`/api/summary?cardId=${c.id}&cycle=${key}`);
            return [c.id, s.total] as const;
          } catch {
            return [c.id, null] as const;
          }
        })
      );
      setSpend(Object.fromEntries(entries));
    } catch {
      setError('Could not load your cards. Try refreshing.');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditing(null);
    setName('');
    setIssuer('');
    setLast4('');
    setClose('');
    setFormErr('');
  }

  function startEdit(c: Card) {
    setEditing(c.id);
    setName(c.name);
    setIssuer(c.issuer);
    setLast4(c.last4);
    setClose(String(c.statementCloseDay));
    setFormErr('');
  }

  async function save() {
    setFormErr('');
    const n = name.trim();
    const i = issuer.trim();
    const l = last4.trim();
    const c = parseInt(close, 10);
    if (!n || !i) return setFormErr('Card name and issuer are required.');
    if (!/^\d{4}$/.test(l)) return setFormErr('Last 4 must be exactly 4 digits.');
    if (!(c >= 1 && c <= 31)) return setFormErr('Statement close day must be between 1 and 31.');

    setSaving(true);
    try {
      const body = JSON.stringify({ name: n, issuer: i, last4: l, statementCloseDay: c });
      if (editing) await api(`/api/cards/${editing}`, { method: 'PATCH', body });
      else await api('/api/cards', { method: 'POST', body });
      resetForm();
      await load();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Could not save the card.');
    } finally {
      setSaving(false);
    }
  }

  async function startDelete(c: Card) {
    setPending(c.id);
    setPendingCount(null);
    try {
      const txns = await api<unknown[]>(`/api/transactions?cardId=${c.id}`);
      setPendingCount(Array.isArray(txns) ? txns.length : null);
    } catch {
      /* count is best-effort */
    }
  }

  async function confirmDelete() {
    if (!pending) return;
    try {
      await api(`/api/cards/${pending}`, { method: 'DELETE' });
      setPending(null);
      await load();
    } catch {
      setError('Could not delete the card.');
    }
  }

  return (
    <div className="space-y-3">
      <div className="mb-2 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-neutral-500" />
        <span className="text-lg font-medium text-neutral-900">Cards</span>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-500">Loading cards…</div>
      ) : (
        cards.map((c, idx) => {
          const [bg, fg] = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
          if (c.id === pending) {
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-rose-300 bg-white p-4"
              >
                <p className="text-sm text-neutral-900">
                  Delete <span className="font-medium">{c.name}</span>
                  {pendingCount != null ? ` and its ${pendingCount} transaction${pendingCount === 1 ? '' : 's'}?` : ' and all its transactions?'}
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setPending(null)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div key={c.id} className="flex items-center gap-3.5 rounded-xl border border-neutral-200 bg-white p-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                style={{ background: bg, color: fg }}
              >
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-neutral-900">{c.name}</p>
                <p className="text-[13px] text-neutral-500">
                  {c.issuer} ·· {c.last4}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  closes on the {ordinal(c.statementCloseDay)}
                </p>
              </div>
              <div className="mr-1 text-right">
                <p className="text-xs text-neutral-500">this cycle</p>
                <p className="mt-0.5 text-base font-medium text-neutral-900">
                  {spend[c.id] != null ? formatUSD(spend[c.id] as number) : '—'}
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => startEdit(c)}
                  aria-label={`Edit ${c.name}`}
                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
                >
                  <Pencil className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={() => startDelete(c)}
                  aria-label={`Delete ${c.name}`}
                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
                >
                  <Trash2 className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Add / edit form */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <p className="mb-3 text-[13px] text-neutral-500">{editing ? 'Edit card' : 'Add a card'}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Card name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sapphire Reserve" className={inputCls} />
          </Field>
          <Field label="Issuer">
            <input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. Chase" className={inputCls} />
          </Field>
          <Field label="Last 4 digits">
            <input
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="4821"
              className={inputCls}
            />
          </Field>
          <Field label="Statement close day">
            <input
              type="number"
              min={1}
              max={31}
              value={close}
              onChange={(e) => setClose(e.target.value)}
              placeholder="15"
              className={inputCls}
            />
          </Field>
        </div>
        {formErr && <p className="mt-2.5 text-xs text-rose-600">{formErr}</p>}
        <div className="mt-3.5 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg border border-neutral-300 px-3.5 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : editing ? 'Update card' : 'Save card'}
          </button>
          {editing && (
            <button onClick={resetForm} className="rounded-lg border border-neutral-300 px-3.5 py-2 text-sm hover:bg-neutral-50">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
