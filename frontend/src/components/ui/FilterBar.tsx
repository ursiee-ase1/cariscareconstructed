import Link from 'next/link';
import { Search } from 'lucide-react';

export interface FilterSelect {
  name: string;
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
}

/**
 * Server-rendered GET filter form: works without JavaScript and produces shareable URLs.
 * Querying happens in the API (database-level search and pagination), not in the browser.
 */
export function FilterBar({
  action,
  q,
  selects = [],
  searchLabel = 'Search',
  hidden = {},
}: {
  action: string;
  q?: string;
  selects?: FilterSelect[];
  searchLabel?: string;
  hidden?: Record<string, string | undefined>;
}) {
  const active = Boolean(q) || selects.some((s) => s.value);
  return (
    <form action={action} method="get" role="search" className="mb-10 rounded-(--radius-card) border border-line bg-surface p-4 md:p-5">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="md:min-w-64 md:flex-[2_1_16rem]">
          <label htmlFor="filter-q" className="mb-1 block text-sm font-semibold text-ink">
            {searchLabel}
          </label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              id="filter-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Keywords"
              className="h-11 w-full rounded-(--radius-control) border border-line bg-white pr-3 pl-9 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
            />
          </div>
        </div>
        {selects.map((s) => (
          <div key={s.name} className="md:flex-[1_1_11rem]">
            <label htmlFor={`filter-${s.name}`} className="mb-1 block text-sm font-semibold text-ink">
              {s.label}
            </label>
            <select
              id={`filter-${s.name}`}
              name={s.name}
              defaultValue={s.value ?? ''}
              className="h-11 w-full rounded-(--radius-control) border border-line bg-white px-3 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
            >
              <option value="">{s.allLabel ?? 'All'}</option>
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex gap-2">
          <button type="submit" className="h-11 rounded-(--radius-control) bg-brand-700 px-5 font-display font-semibold text-white hover:bg-brand-800">
            Apply
          </button>
          {active && (
            <Link href={`${action}${hidden.when ? `?when=${hidden.when}` : ''}`} className="flex h-11 items-center rounded-(--radius-control) px-3 font-semibold text-brand-700 hover:bg-white">
              Clear
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}

/** "Showing 1–12 of 132 results" line, announced to screen readers. */
export function ResultCount({ page, pageSize, total, noun = 'results' }: { page: number; pageSize: number; total: number; noun?: string }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <p className="meta mb-5" aria-live="polite">
      Showing {from}–{to} of {total} {noun}
    </p>
  );
}

export const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
export const pageParam = (v: string | string[] | undefined) => Math.max(1, Math.min(1000, Number(firstParam(v)) || 1));
