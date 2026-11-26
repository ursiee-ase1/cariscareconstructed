import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { CmsPageView } from '@/components/layout/CmsPageView';
import { RichText } from '@/components/ui/Typography';
import { findSection, firstImage, isLibraryImage, joinSections, splitAtHeadings, withoutImageParagraphs } from '@/lib/cms-html';
import { buildMetadata } from '@/lib/seo';
import { resolvePage } from '@/services/public';

/**
 * Academic Programmes. The programme content is the CMS page "training/academic-programmes"
 * (Admin › Pages); this route lays out its "Programmes" section as cards and adds who runs the
 * programmes and how to contact them. Without a "Programmes" heading the body is shown as written.
 */
const PATH = '/training/academic-programmes';
const DEPARTMENT = 'Department of Supply Chain and Information Systems, KNUST School of Business';
const DEPARTMENT_EMAIL = 'info@carisca.knust.edu.gh';

export async function generateMetadata(): Promise<Metadata> {
  const r = await resolvePage(PATH);
  if (r?.type !== 'page') return {};
  const p = r.page;
  return buildMetadata({ title: p.seo_title || p.title, description: p.seo_description || p.summary, path: PATH, image: p.ogImage ?? p.heroImage });
}

/** The programmes (one per `<h3>` in the "Programmes" section), each with its photo and text. */
function programmeCards(html: string) {
  return splitAtHeadings(html, 3)
    .filter((s) => s.heading)
    .map((s) => ({ title: s.heading!, image: firstImage(s.html), html: withoutImageParagraphs(s.html) }));
}

export default async function AcademicProgrammesPage() {
  const r = await resolvePage(PATH);
  if (!r) notFound();
  if (r.type === 'redirect') {
    if (r.status === 302) redirect(r.to);
    permanentRedirect(r.to);
  }
  const page = r.page;

  const sections = splitAtHeadings(page.body, 2);
  const programmes = findSection(sections, 'Programmes');
  const cards = programmes ? programmeCards(programmes.html) : [];
  const split = programmes && cards.length > 0;
  const at = split ? sections.indexOf(programmes) : -1;
  const intro = split ? joinSections(sections.slice(0, at)) : null;
  const rest = split ? joinSections(sections.slice(at + 1)) : page.body;

  return (
    <CmsPageView
      page={{ ...page, body: rest }}
      siblings={r.siblings}
      before={
        <>
          <section aria-label="Who runs these programmes" className="mb-10 rounded-(--radius-card) border border-brand-100 border-l-4 border-l-brand-700 bg-brand-50 p-5 md:p-6">
            <div>
              <p className="font-display text-sm font-semibold tracking-[0.1em] text-brand-700 uppercase">Offered by the department</p>
              <p className="mt-1.5 text-[1.05rem] leading-relaxed text-ink">
                The graduate programmes are offered and administered by the <strong>Department of Supply Chain and Information Systems, KNUST School of Business</strong>, in
                collaboration with CARISCA.
              </p>
            </div>
          </section>
          {intro && <RichText html={intro} />}
          {split && (
            <section aria-labelledby="programmes-heading" className="mt-12 mb-4">
              <h2 id="programmes-heading" className="text-[1.75rem] font-bold">
                {programmes.heading}
              </h2>
              <ul className="mt-6 grid gap-6 md:grid-cols-3">
                {cards.map((c) => (
                  <li key={c.title} className="flex flex-col overflow-hidden rounded-(--radius-card) border border-line bg-white shadow-(--shadow-card)">
                    {c.image && (
                      <div className="relative aspect-3/2 bg-surface">
                        <Image src={c.image.src} alt={c.image.alt} fill unoptimized={!isLibraryImage(c.image.src)} sizes="(min-width:768px) 20rem, 100vw" className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 p-5">
                      <h3 className="text-lg leading-snug font-bold">{c.title}</h3>
                      <RichText html={c.html} className="prose-base! mt-2 [&_p]:text-[0.95rem]" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      }
    >
      <section id="programme-contact" aria-labelledby="programme-contact-heading" className="mt-12 rounded-(--radius-card) border border-line bg-surface p-6 md:p-8">
        <h2 id="programme-contact-heading" className="text-[1.4rem] font-bold">
          Programme enquiries
        </h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-(--radius-control) bg-white p-4 ring-1 ring-line">
            <dt className="text-sm font-semibold text-muted">Department</dt>
            <dd className="mt-1 font-semibold text-ink">{DEPARTMENT}</dd>
          </div>
          <div className="rounded-(--radius-control) bg-white p-4 ring-1 ring-line">
            <dt className="text-sm font-semibold text-muted">Email</dt>
            <dd className="mt-1">
              <a href={`mailto:${DEPARTMENT_EMAIL}`} className="link break-all">
                {DEPARTMENT_EMAIL}
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </CmsPageView>
  );
}
