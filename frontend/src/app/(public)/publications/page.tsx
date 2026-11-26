import { BookOpen } from 'lucide-react';
import { PublicationCard } from '@/components/cards/Cards';
import { PageHeader } from '@/components/layout/PageHeader';
import { MoreInSection } from '@/components/layout/CmsPageView';
import { FilterBar, ResultCount, firstParam, pageParam } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/Typography';
import { PUBLICATION_TYPE_LABELS } from '@/lib/format';
import { buildMetadata } from '@/lib/seo';
import { getPublicationFacets, getPublications } from '@/services/public';
import type { PublicationType } from '@/types/api';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata = buildMetadata({
  title: 'Publications & Resources',
  description: 'CARISCA industry reports, policy briefs, research reports and journal articles on supply chains in Ghana and Africa.',
  path: '/publications',
});

export default async function PublicationsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const type = firstParam(sp.type);
  const q = firstParam(sp.q)?.slice(0, 200);
  const author = firstParam(sp.author)?.slice(0, 150);
  const year = Number(firstParam(sp.year)) || undefined;
  const [list, facets] = await Promise.all([getPublications({ page, pageSize: 10, type, q, author, year }), getPublicationFacets()]);

  return (
    <>
      <PageHeader
        title="Publications & Resources"
        eyebrow="Research"
        intro="Data-driven insights and empirical research to inform decision-making for businesses, policymakers and other stakeholders in Africa’s supply chain sectors."
        crumbs={[{ label: 'Research', href: '/research' }, { label: 'Publications & Resources' }]}
      />
      <div className="container-site py-12 md:py-16">
        <FilterBar
          action="/publications"
          q={q}
          searchLabel="Search titles, abstracts and authors"
          hidden={{ author }}
          selects={[
            {
              name: 'type',
              label: 'Type',
              value: type,
              allLabel: 'All types',
              options: facets.types.map((t) => ({ value: t.type, label: `${PUBLICATION_TYPE_LABELS[t.type as PublicationType] ?? t.type} (${t.count})` })),
            },
            {
              name: 'year',
              label: 'Year',
              value: year ? String(year) : undefined,
              allLabel: 'Any year',
              options: facets.years.map((y) => ({ value: String(y.publication_year), label: `${y.publication_year} (${y.count})` })),
            },
          ]}
        />
        {author && (
          <p className="mb-4 text-muted">
            Showing publications by <strong className="text-ink">{author}</strong>.
          </p>
        )}
        <ResultCount {...list.meta} noun="publications" />
        {list.data.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {list.data.map((p) => (
              <PublicationCard key={p.id} publication={p} layout="horizontal" />
            ))}
          </div>
        ) : (
          <EmptyState title="No publications match your search." icon={<BookOpen className="size-6" />}>
            Try different keywords or clear the filters.
          </EmptyState>
        )}
        <Pagination meta={list.meta} basePath="/publications" params={{ type, q, author, year: year ? String(year) : undefined }} />
      </div>
      {/* The other pages of the Research section. */}
      <MoreInSection path="publications" />
    </>
  );
}
