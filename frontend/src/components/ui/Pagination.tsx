import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PageMeta } from '@/types/api';

/** Link-based pagination that preserves the current filters. Works without JavaScript. */
export function Pagination({ meta, basePath, params = {} }: { meta: PageMeta; basePath: string; params?: Record<string, string | undefined> }) {
  if (meta.totalPages <= 1) return null;
  const href = (page: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (page > 1) sp.set('page', String(page));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const current = meta.page;
  const pages = new Set([1, meta.totalPages, current - 1, current, current + 1].filter((p) => p >= 1 && p <= meta.totalPages));
  const list = [...pages].sort((a, b) => a - b);

  const item = 'inline-flex h-10 min-w-10 items-center justify-center rounded-(--radius-control) px-3 font-display font-semibold';
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-1.5">
      {current > 1 ? (
        <Link href={href(current - 1)} className={`${item} text-brand-700 hover:bg-brand-50`} rel="prev">
          <ChevronLeft aria-hidden className="size-4" /> Previous
        </Link>
      ) : null}
      {list.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - list[i - 1] > 1 && <span className="px-1 text-muted" aria-hidden>…</span>}
          {p === current ? (
            <span aria-current="page" className={`${item} bg-brand-700 text-white`}>
              {p}
            </span>
          ) : (
            <Link href={href(p)} className={`${item} text-brand-700 hover:bg-brand-50`} aria-label={`Page ${p}`}>
              {p}
            </Link>
          )}
        </span>
      ))}
      {current < meta.totalPages ? (
        <Link href={href(current + 1)} className={`${item} text-brand-700 hover:bg-brand-50`} rel="next">
          Next <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : null}
      <p className="sr-only" aria-live="polite">
        Page {current} of {meta.totalPages}, {meta.total} results
      </p>
    </nav>
  );
}
