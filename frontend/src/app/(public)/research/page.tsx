import Link from 'next/link';
import { ProjectCard, PublicationCard } from '@/components/cards/Cards';
import { CmsPageView } from '@/components/layout/CmsPageView';
import { SectionHeading } from '@/components/ui/Typography';
import { buildMetadata } from '@/lib/seo';
import { getNonAsnRaProjects, getPublications, getResearchThemes, resolvePage } from '@/services/public';
import { notFound } from 'next/navigation';

export async function generateMetadata() {
  const r = await resolvePage('/research');
  const page = r?.type === 'page' ? r.page : null;
  return buildMetadata({ title: page?.seo_title || 'Research', description: page?.seo_description || page?.summary, path: '/research', image: page?.heroImage });
}

export default async function ResearchPage() {
  const [resolved, themes, projects, pubs] = await Promise.all([
    resolvePage('/research'),
    getResearchThemes(),
    // ASN-RA projects are presented on the ASN-RA page (see the section cards), not repeated here.
    getNonAsnRaProjects({ pageSize: 6 }),
    getPublications({ pageSize: 4 }),
  ]);
  if (resolved?.type !== 'page') notFound();
  return (
    <CmsPageView page={resolved.page} siblings={resolved.siblings}>
      {themes.length > 0 && (
        <section aria-labelledby="themes-heading" className="mt-12">
          <SectionHeading id="themes-heading" title="Research themes" />
          <div className="grid gap-4 sm:grid-cols-2">
            {themes.map((t) => (
              <div key={t.id} className="rounded-(--radius-card) border-l-4 border-sky-accent bg-surface p-5">
                <h3 className="text-lg font-bold">
                  <Link href={`/research/projects?theme=${t.slug}`} className="hover:text-brand-700 hover:underline">
                    {t.name}
                  </Link>
                </h3>
                {t.summary && <p className="mt-2 text-[0.95rem] text-muted">{t.summary}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {projects.data.length > 0 && (
        <section aria-labelledby="projects-heading" className="mt-14">
          <SectionHeading id="projects-heading" title="Research projects" action={{ href: '/research/projects', label: 'All projects' }} />
          <div className="grid gap-5 md:grid-cols-2">
            {projects.data.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      )}

      {pubs.data.length > 0 && (
        <section aria-labelledby="outputs-heading" className="mt-14">
          <SectionHeading id="outputs-heading" title="Recent research outputs" action={{ href: '/publications', label: 'All publications' }} />
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {pubs.data.map((p) => (
              <PublicationCard key={p.id} publication={p} />
            ))}
          </div>
        </section>
      )}
    </CmsPageView>
  );
}
