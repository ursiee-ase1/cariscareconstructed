import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { firstParam, pageParam } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/Typography';
import { formatDate } from '@/lib/format';
import { buildMetadata } from '@/lib/seo';
import { search } from '@/services/public';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TYPES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'news', label: 'News' },
  { value: 'publication', label: 'Publications' },
  { value: 'event', label: 'Events' },
  { value: 'research', label: 'Research' },
  { value: 'training', label: 'Training' },
  { value: 'page', label: 'Pages' },
];

export async function generateMetadata({ searchParams }: Props) {
  const q = firstParam((await searchParams).q);
  return buildMetadata({ title: q ? `Search: ${q}` : 'Search', path: '/search', noindex: true });
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? '').trim().slice(0, 200);
  const type = TYPES.some((t) => t.value === firstParam(sp.type)) ? firstParam(sp.type)! : 'all';
  const page = pageParam(sp.page);
  const res = q.length >= 2 ? await search({ q, type, page }) : null;
  const label = (v: string) => TYPES.find((t) => t.value === v)?.label ?? v;

  return (
    <>
      <PageHeader title="Search" crumbs={[{ label: 'Search' }]}>
        <form action="/search" role="search" className="mt-6 flex max-w-2xl gap-2">
          <label htmlFor="site-search" className="sr-only">
            Search the CARISCA website
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            defaultValue={q}
            minLength={2}
            placeholder="Search news, publications, events and pages"
            className="h-12 flex-1 rounded-(--radius-control) border-0 px-4 text-base text-ink outline-none focus:ring-3 focus:ring-sky-accent"
          />
          {type !== 'all' && <input type="hidden" name="type" value={type} />}
          <button type="submit" className="h-12 rounded-(--radius-control) bg-sky-accent px-6 font-display font-bold text-brand-950 hover:bg-sky-accent-strong">
            Search
          </button>
        </form>
      </PageHeader>
      <div className="container-site py-12">
        {!res && <p className="text-lg text-muted">Enter at least two characters to search published content.</p>}
        {res && (
          <>
            <nav aria-label="Filter results by type" className="mb-8 flex flex-wrap gap-2">
              {TYPES.map((t) => {
                const count = t.value === 'all' ? Object.values(res.data.counts).reduce((a, b) => a + b, 0) : res.data.counts[t.value];
                const active = t.value === type;
                return (
                  <Link
                    key={t.value}
                    href={`/search?q=${encodeURIComponent(q)}${t.value === 'all' ? '' : `&type=${t.value}`}`}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${active ? 'border-brand-700 bg-brand-700 text-white' : 'border-line text-brand-800 hover:bg-brand-50'}`}
                  >
                    {t.label}
                    {count !== undefined && <span className={active ? 'text-brand-100' : 'text-muted'}> ({count})</span>}
                  </Link>
                );
              })}
            </nav>
            <p className="meta mb-4" aria-live="polite">
              {res.meta.total} result{res.meta.total === 1 ? '' : 's'} for “{q}”
            </p>
            {res.data.results.length ? (
              <ol className="divide-y divide-line">
                {res.data.results.map((r) => (
                  <li key={`${r.type}-${r.url}`} className="py-5">
                    <p className="text-xs font-semibold tracking-wide text-sky-ink uppercase">
                      {label(r.type)}
                      {r.date ? ` · ${typeof r.date === 'number' ? r.date : formatDate(String(r.date))}` : ''}
                    </p>
                    <h2 className="mt-1 text-lg font-bold">
                      <Link href={r.url} className="hover:text-brand-700 hover:underline">
                        {r.title}
                      </Link>
                    </h2>
                    {r.snippet && <p className="mt-1 text-muted">{r.snippet}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title={`No results for “${q}”.`} icon={<SearchX className="size-6" />}>
                Check the spelling or try fewer or different keywords.
              </EmptyState>
            )}
            {type !== 'all' && <Pagination meta={res.meta} basePath="/search" params={{ q, type }} />}
            {type === 'all' && res.meta.total > res.data.results.length && (
              <p className="mt-6 text-muted">Showing the most relevant results. Choose a type above to see all matches.</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
