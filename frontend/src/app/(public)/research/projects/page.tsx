import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, FlaskConical, Network } from 'lucide-react';
import { ProjectCard } from '@/components/cards/Cards';
import { PageHeader } from '@/components/layout/PageHeader';
import { ResultCount, firstParam, pageParam } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/Typography';
import { buildMetadata } from '@/lib/seo';
import { getNonAsnRaProjects, getResearchThemes } from '@/services/public';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata = buildMetadata({
  title: 'Research Projects',
  description: 'Research projects led and supported by CARISCA. Africa Supply Network Research Accelerator (ASN-RA) projects are listed on the ASN-RA page.',
  path: '/research/projects',
});

export default async function ProjectsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const theme = firstParam(sp.theme);
  const status = firstParam(sp.status);
  const filtered = Boolean(theme || status || page > 1);
  const [list, themes, all] = await Promise.all([
    getNonAsnRaProjects({ page, pageSize: 12, theme, status }),
    getResearchThemes(),
    filtered ? getNonAsnRaProjects({ pageSize: 1 }) : null,
  ]);
  // ASN-RA projects now live on the ASN-RA page. While every project belongs to ASN-RA, this
  // address (kept for old links and bookmarks) forwards there instead of showing an empty list.
  if ((all ?? list).meta.total === 0) redirect('/asn-ra#research-projects');
  return (
    <>
      <PageHeader title="Research Projects" eyebrow="Research" crumbs={[{ label: 'Research', href: '/research' }, { label: 'Projects' }]} />
      <div className="container-site py-12 md:py-16">
        <Link
          href="/asn-ra#research-projects"
          className="group mb-8 flex items-center gap-4 rounded-(--radius-card) border border-brand-100 bg-brand-50 p-4 text-brand-900 transition-colors hover:border-brand-300 md:p-5"
        >
          <Network aria-hidden className="size-6 shrink-0 text-brand-600" />
          <span className="flex-1">
            <span className="font-display font-semibold">Looking for ASN-RA projects?</span>{' '}
            <span className="text-body">Africa Supply Network Research Accelerator projects are listed on the ASN-RA page.</span>
          </span>
          <ArrowRight aria-hidden className="size-5 shrink-0 text-brand-700 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <form action="/research/projects" className="mb-8 flex flex-wrap items-end gap-3 rounded-(--radius-card) border border-line bg-surface p-4">
          <div>
            <label htmlFor="theme" className="mb-1 block text-sm font-semibold text-ink">
              Theme
            </label>
            <select id="theme" name="theme" defaultValue={theme ?? ''} className="h-11 rounded-(--radius-control) border border-line bg-white px-3">
              <option value="">All themes</option>
              {themes.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-semibold text-ink">
              Status
            </label>
            <select id="status" name="status" defaultValue={status ?? ''} className="h-11 rounded-(--radius-control) border border-line bg-white px-3">
              <option value="">Any status</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="planned">Planned</option>
            </select>
          </div>
          <button type="submit" className="h-11 rounded-(--radius-control) bg-brand-700 px-5 font-display font-semibold text-white hover:bg-brand-800">
            Apply
          </button>
        </form>
        <ResultCount {...list.meta} noun="projects" />
        {list.data.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {list.data.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <EmptyState title="No projects match these filters." icon={<FlaskConical className="size-6" />} />
        )}
        <Pagination meta={list.meta} basePath="/research/projects" params={{ theme, status }} />
      </div>
    </>
  );
}
