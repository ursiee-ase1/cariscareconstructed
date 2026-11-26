import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { firstParam, pageParam } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/Typography';
import { Highlight } from '@/components/ui/Highlight';
import { formatDate } from '@/lib/format';
import { MIN_QUERY_LENGTH, SEARCH_TYPES, searchTypeLabel } from '@/lib/search';
import { buildMetadata } from '@/lib/seo';
import { search } from '@/services/public';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TYPES = SEARCH_TYPES;

export async function generateMetadata({ searchParams }: Props) {
  const q = firstParam((await searchParams).q);
  return buildMetadata({ title: q ? `Search: ${q}` : 'Search', path: '/search', noindex: true });
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? '').trim().slice(0, 200);
  const type = TYPES.some((t) => t.value === firstParam(sp.type)) ? firstParam(sp.type)! : 'all';
  const page = pageParam(sp.page);
  const res = q.length >= MIN_QUERY_LENGTH ? await search({ q, type, page }) : null;

  return (
    <>
      <PageHeader
        title={q.length >= MIN_QUERY_LENGTH ? `Results for “${q}”` : 'Search'}
        intro={q.length >= MIN_QUERY_LENGTH ? undefined : 'Use the search box at the top of the page to search news, publications, events and pages.'}
        crumbs={[{ label: 'Search' }]}
      />
      <div className="container-site py-12">
        {!res && <p className="text-lg text-muted">Enter at least two characters in the search box at the top of the page.</p>}
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
                      {searchTypeLabel(r.type)}
                      {r.date ? ` · ${typeof r.date === 'number' ? r.date : formatDate(String(r.date))}` : ''}
                    </p>
                    <h2 className="mt-1 text-lg font-bold">
                      <Link href={r.url} className="hover:text-brand-700 hover:underline">
                        <Highlight text={r.title} query={q} />
                      </Link>
                    </h2>
                    {r.snippet && (
                      <p className="mt-1 text-muted">
                        <Highlight text={r.snippet} query={q} />
                      </p>
                    )}
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
