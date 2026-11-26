import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { FileDownload } from '@/components/ui/FileDownload';
import { EmptyState, RichText, SectionHeading } from '@/components/ui/Typography';
import { buildMetadata } from '@/lib/seo';
import { getLmiReports, getSite, resolvePage } from '@/services/public';

export async function generateMetadata() {
  const r = await resolvePage('/lmi');
  const page = r?.type === 'page' ? r.page : null;
  return buildMetadata({
    title: page?.seo_title || 'Logistics Managers Index (LMI)',
    description: page?.seo_description || page?.summary || 'The Ghana Logistics Managers Index, published quarterly by CARISCA.',
    path: '/lmi',
    image: page?.heroImage,
  });
}

export default async function LmiPage() {
  const [resolved, reports, { settings }] = await Promise.all([resolvePage('/lmi'), getLmiReports(), getSite()]);
  const page = resolved?.type === 'page' ? resolved.page : null;
  return (
    <>
      <PageHeader
        title={page?.title ?? 'Logistics Managers Index (LMI)'}
        eyebrow="Research"
        intro={page?.summary}
        crumbs={[{ label: 'Research', href: '/research' }, { label: 'Logistics Managers Index' }]}
      />
      <div className="container-site grid gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <RichText html={page?.body} />

          <section aria-labelledby="reports-heading" className="mt-14">
            <SectionHeading id="reports-heading" title="Quarterly reports" />
            {reports.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {reports.map((r) => (
                  <li key={r.id}>
                    {r.file ? (
                      <FileDownload file={r.file} label={`Ghana LMI Report: ${r.period_label}`} />
                    ) : (
                      <div className="rounded-(--radius-card) border border-dashed border-line p-4 text-muted">
                        <p className="font-display font-semibold text-ink">Ghana LMI Report: {r.period_label}</p>
                        <p className="text-sm">Report file not yet available.</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No LMI reports have been published yet." />
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {settings.lmi_survey_url && (
            <div className="rounded-(--radius-card) bg-brand-900 p-6 text-white">
              <ClipboardList aria-hidden className="size-8 text-sky-accent" />
              <h2 className="mt-3 text-xl font-bold text-white">Take part in the LMI survey</h2>
              <p className="mt-2 text-brand-100">{settings.lmi_survey_label}</p>
              <p className="mt-2 text-sm text-brand-200">Senior executives and managers of Ghanaian organisations are invited to participate.</p>
              <ButtonLink href={settings.lmi_survey_url} variant="light" className="mt-5 w-full">
                Open the survey
              </ButtonLink>
            </div>
          )}
          <div className="rounded-(--radius-card) border border-line p-5">
            <h2 className="font-display text-lg font-bold">Reading the index</h2>
            <p className="mt-2 text-[0.95rem] text-muted">
              Values above 50 indicate expansion in logistics activity; values below 50 indicate contraction.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
