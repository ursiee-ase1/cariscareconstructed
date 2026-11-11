import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { Building2, GraduationCap, Mail } from 'lucide-react';
import { CmsPageView } from '@/components/layout/CmsPageView';
import { buildMetadata } from '@/lib/seo';
import { resolvePage } from '@/services/public';

/**
 * Academic Programmes. The programme content is the CMS page "training/academic-programmes"
 * (Admin › Pages); this route adds who runs the programmes and how to contact them.
 * Sub-pages (e.g. /training/academic-programmes/bsc-…) are still served by the CMS catch-all.
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

export default async function AcademicProgrammesPage() {
  const r = await resolvePage(PATH);
  if (!r) notFound();
  if (r.type === 'redirect') {
    if (r.status === 302) redirect(r.to);
    permanentRedirect(r.to);
  }
  const page = r.page;

  return (
    <CmsPageView
      page={page}
      siblings={r.siblings}
      before={
        <section aria-label="Who runs these programmes" className="mb-10 flex gap-4 rounded-(--radius-card) border border-brand-100 border-l-4 border-l-brand-700 bg-brand-50 p-5 md:p-6">
          <Building2 aria-hidden className="mt-0.5 size-6 shrink-0 text-brand-700" />
          <div>
            <p className="font-display text-sm font-semibold tracking-[0.1em] text-brand-700 uppercase">Offered by the department</p>
            <p className="mt-1.5 text-[1.05rem] leading-relaxed text-ink">
              The graduate programmes are offered and administered by the <strong>Department of Supply Chain and Information Systems, KNUST School of Business</strong>, in
              collaboration with CARISCA.
            </p>
          </div>
        </section>
      }
    >
      <section id="programme-contact" aria-labelledby="programme-contact-heading" className="mt-12 rounded-(--radius-card) border border-line bg-surface p-6 md:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-(--radius-control) bg-brand-700 text-white">
            <GraduationCap aria-hidden className="size-5" />
          </span>
          <h2 id="programme-contact-heading" className="text-[1.4rem] font-bold">
            Programme enquiries
          </h2>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-(--radius-control) bg-white p-4 ring-1 ring-line">
            <dt className="text-sm font-semibold text-muted">Department</dt>
            <dd className="mt-1 font-semibold text-ink">{DEPARTMENT}</dd>
          </div>
          <div className="rounded-(--radius-control) bg-white p-4 ring-1 ring-line">
            <dt className="text-sm font-semibold text-muted">Email</dt>
            <dd className="mt-1">
              <a href={`mailto:${DEPARTMENT_EMAIL}`} className="link inline-flex items-center gap-2 break-all">
                <Mail aria-hidden className="size-4 shrink-0" />
                {DEPARTMENT_EMAIL}
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </CmsPageView>
  );
}
