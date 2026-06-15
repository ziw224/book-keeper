'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarNotice {
  date: string;
  label: string;
  color: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  notices?: CalendarNotice[];
  placeholder?: string;
  openUp?: boolean;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number) { return String(n).padStart(2, '0'); }
function dateKey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function todayKey() { const n = new Date(); return dateKey(n.getFullYear(), n.getMonth(), n.getDate()); }

function formatDisplay(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${pad(m)}/${pad(d)}/${y}`;
}

function buildCells(year: number, monthIdx: number) {
  const firstDow = new Date(year, monthIdx, 1).getDay();
  const dim = new Date(year, monthIdx + 1, 0).getDate();
  const prevDim = new Date(year, monthIdx, 0).getDate();
  const cells: { day: number; key: string; muted: boolean }[] = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevDim - i;
    cells.push({ day: d, key: dateKey(year, monthIdx - 1, d), muted: true });
  }
  for (let d = 1; d <= dim; d++) {
    cells.push({ day: d, key: dateKey(year, monthIdx, d), muted: false });
  }
  let nd = 1;
  while (cells.length < 42) {
    cells.push({ day: nd, key: dateKey(year, monthIdx + 1, nd), muted: true });
    nd++;
  }
  return cells;
}

export default function CalendarPicker({ value, onChange, notices = [], placeholder, openUp }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initial = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  useEffect(() => {
    if (open && value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [open, value]);

  const cells = useMemo(() => buildCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = todayKey();

  const noticeMap = useMemo(() => {
    const m = new Map<string, CalendarNotice[]>();
    for (const n of notices) {
      const arr = m.get(n.date) || [];
      arr.push(n);
      m.set(n.date, arr);
    }
    return m;
  }, [notices]);

  const activeNotices = noticeMap.get(hovered || value) || [];
  const monthNotices = notices.filter(n => {
    const [, nm] = n.date.split('-').map(Number);
    return nm === viewMonth + 1;
  });

  function prev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function next() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }
  function select(key: string) {
    onChange(key);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex h-9 w-full items-center justify-between rounded-lg border bg-white px-3 text-left text-xs font-semibold shadow-sm transition ${
          open ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={value ? '' : 'text-slate-400'}>{value ? formatDisplay(value) : (placeholder || 'Pick date')}</span>
        <CalendarDays className="h-4 w-4 text-slate-500" />
      </button>

      {open && (
        <div className={`absolute left-0 z-[60] w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${openUp ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'}`}>
          {/* Month header */}
          <div className="flex items-center justify-between px-5 py-4">
            <button onClick={prev} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-base font-bold tracking-tight">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button onClick={next} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday row */}
          <div className="grid grid-cols-7 px-5 text-center text-xs font-bold text-slate-400">
            {WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7 gap-y-0.5 px-5 pb-3">
            {cells.map(cell => {
              const isSelected = cell.key === value;
              const isToday = cell.key === today;
              const cn = noticeMap.get(cell.key) || [];

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => select(cell.key)}
                  onMouseEnter={() => setHovered(cell.key)}
                  onMouseLeave={() => setHovered(null)}
                  className={[
                    'relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl text-sm font-semibold transition',
                    cell.muted ? 'text-slate-300' : 'text-slate-800',
                    isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'hover:bg-slate-100',
                    isToday && !isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : '',
                  ].join(' ')}
                >
                  {cell.day}
                  {cn.length > 0 && (
                    <span className="absolute bottom-1 flex gap-0.5">
                      {cn.slice(0, 3).map((n, i) => (
                        <span key={i} className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white/80' : ''}`} style={isSelected ? {} : { background: n.color }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notices for hovered/selected date */}
          {(activeNotices.length > 0 || monthNotices.length > 0) && (
            <div className="border-t border-slate-100 px-5 py-3">
              {activeNotices.length > 0 && (
                <div className="mb-2 space-y-1">
                  {activeNotices.map((n, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: n.color }} />
                      <span className="font-medium text-slate-600">{n.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeNotices.length === 0 && monthNotices.length > 0 && (
                <div className="space-y-1">
                  {monthNotices.slice(0, 4).map((n, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: n.color }} />
                      <span className="font-medium text-slate-600">{n.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Clear</button>
            <button type="button" onClick={() => select(today)} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
