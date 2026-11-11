import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { CmsImage } from '@/components/ui/CmsImage';
import { Badge, RichText } from '@/components/ui/Typography';
import { PUBLICATION_TYPE_LABELS } from '@/lib/format';
import { buildMetadata } from '@/lib/seo';
import { getResearchProject, isAsnRaProject } from '@/services/public';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getResearchProject((await params).slug);
  if (!p) return {};
  return buildMetadata({ title: p.seo_title || p.title, description: p.seo_description || p.summary, path: `/research/projects/${p.slug}`, image: p.ogImage ?? p.image });
}

export default async function ProjectPage({ params }: Props) {
  const p = await getResearchProject((await params).slug);
  if (!p) notFound();
  const sections: Array<[string, string | null]> = [
    ['The research problem', p.problem],
    ['Contribution', p.contribution],
    ['Practical relevance', p.relevance],
  ];
  const years = p.start_year ? `${p.start_year}${p.end_year ? `–${p.end_year}` : '–present'}` : null;
  return (
    <>
      <PageHeader title={p.title} eyebrow={p.programme ?? 'Research project'} intro={p.summary} crumbs={[{ label: 'Research', href: '/research' }, isAsnRaProject(p) ? { label: 'ASN-RA', href: '/asn-ra#research-projects' } : { label: 'Projects', href: '/research/projects' }, { label: p.title }]} />
      <div className="container-site grid gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="max-w-3xl">
          {p.image && <CmsImage media={p.image} slot="feature" rounded className="mb-8" sizes="(min-width:1024px) 48rem, 100vw" />}
          {sections
            .filter(([, text]) => text)
            .map(([heading, text]) => (
              <section key={heading} className="mb-8">
                <h2 className="text-2xl font-bold">{heading}</h2>
                <p className="mt-3 text-lg leading-relaxed whitespace-pre-line">{text}</p>
              </section>
            ))}
          <RichText html={p.body} />
          {p.publications && p.publications.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold">Outputs</h2>
              <ul className="mt-4 space-y-2">
                {p.publications.map((pub) => (
                  <li key={pub.id}>
                    <Link href={`/publications/${pub.slug}`} className="link">
                      {pub.title}
                    </Link>{' '}
                    <span className="meta">
                      ({PUBLICATION_TYPE_LABELS[pub.type]}
                      {pub.publication_year ? `, ${pub.publication_year}` : ''})
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside>
          <dl className="space-y-4 rounded-(--radius-card) border border-line bg-surface p-5">
            <div>
              <dt className="text-sm font-semibold text-muted">Status</dt>
              <dd className="mt-1">
                <Badge tone={p.project_status === 'completed' ? 'neutral' : 'success'}>{p.project_status}</Badge>
              </dd>
            </div>
            {p.theme && (
              <div>
                <dt className="text-sm font-semibold text-muted">Theme</dt>
                <dd className="mt-1">
                  <Link href={`/research/projects?theme=${p.theme.slug}`} className="link">
                    {p.theme.name}
                  </Link>
                </dd>
              </div>
            )}
            {years && (
              <div>
                <dt className="text-sm font-semibold text-muted">Period</dt>
                <dd className="mt-1">{years}</dd>
              </div>
            )}
            {p.lead_researchers && (
              <div>
                <dt className="text-sm font-semibold text-muted">Researchers</dt>
                <dd className="mt-1">{p.lead_researchers}</dd>
              </div>
            )}
            {p.team && (
              <div>
                <dt className="text-sm font-semibold text-muted">Team</dt>
                <dd className="mt-1 whitespace-pre-line">{p.team}</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </>
  );
}
