export type MonthKey = string; // "2026-08"

const pad2 = (n: number) => String(n).padStart(2, '0');

// Mai toISOString: in UTC+N sfasa di un giorno
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function currentMonth(): MonthKey {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

// slice e non split: con noUncheckedIndexedAccess split()[i] è string | undefined
function parseMonth(m: MonthKey): { year: number; monthIndex: number } {
  return { year: Number(m.slice(0, 4)), monthIndex: Number(m.slice(5, 7)) - 1 };
}

export function addMonths(m: MonthKey, delta: number): MonthKey {
  const { year, monthIndex } = parseMonth(m);
  const d = new Date(year, monthIndex + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function monthRange(m: MonthKey): { startDate: string; endDate: string } {
  const { year, monthIndex } = parseMonth(m);
  return {
    startDate: toDateKey(new Date(year, monthIndex, 1)),
    endDate: toDateKey(new Date(year, monthIndex + 1, 0)),
  };
}

export function formatMonth(m: MonthKey): string {
  const { year, monthIndex } = parseMonth(m);
  const s = new Date(year, monthIndex, 1).toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function monthOf(date: string): MonthKey | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date.slice(0, 7);
}

export function wholeMonthOf(start: string, end: string): MonthKey | null {
  const m = monthOf(start);
  if (!m) return null;
  const range = monthRange(m);
  return range.startDate === start && range.endDate === end ? m : null;
}

interface Props {
  month: MonthKey;
  onChange: (m: MonthKey) => void;
  label?: string;
  className?: string;
}

export function MonthNavigator({ month, onChange, label, className }: Props) {
  // un'etichetta custom significa "non siamo su un mese pulito": il pulsante deve restare
  const isCurrent = label === undefined && month === currentMonth();

  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => onChange(addMonths(month, -1))}
        aria-label="Mese precedente"
        className="flex-shrink-0 p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="flex-1 min-w-0 truncate text-center text-sm font-medium text-gray-900">
        {label ?? formatMonth(month)}
      </span>

      <button
        type="button"
        onClick={() => onChange(addMonths(month, 1))}
        aria-label="Mese successivo"
        className="flex-shrink-0 p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {!isCurrent && (
        <button
          type="button"
          onClick={() => onChange(currentMonth())}
          className="flex-shrink-0 px-2 py-1 rounded-lg text-xs text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
        >
          <span className="hidden sm:inline">Mese corrente</span>
          <span className="sm:hidden">Oggi</span>
        </button>
      )}
    </div>
  );
}
