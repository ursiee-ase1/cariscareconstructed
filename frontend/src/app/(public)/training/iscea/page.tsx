import Image from 'next/image';
import { notFound } from 'next/navigation';
import { BadgePercent, FileDown } from 'lucide-react';
import { ContactForm } from '@/components/forms/ContactForm';
import { CmsPageView, crumbsFor } from '@/components/layout/CmsPageView';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { RichText } from '@/components/ui/Typography';
import { findSection, isLibraryImage, joinSections, splitAtHeadings, type HtmlSection } from '@/lib/cms-html';
import { buildMetadata } from '@/lib/seo';
import { resolvePage } from '@/services/public';

export async function generateMetadata() {
  const r = await resolvePage('/training/iscea');
  const p = r?.type === 'page' ? r.page : null;
  return buildMetadata({ title: p?.seo_title || p?.title || 'ISCEA Certifications', description: p?.seo_description || p?.summary, path: '/training/iscea', image: p?.heroImage });
}

/** One certification (an `<h3>` under "Available certification programmes"). */
function certification(s: HtmlSection) {
  const name = s.heading!;
  const code = name.match(/\(([A-Z]{2,})\)\s*$/)?.[1] ?? null;
  const costPara = [...s.html.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((m) => m[0]).find((p) => /Cost:/i.test(p)) ?? '';
  const cost = costPara.match(/Cost:\s*(?:<\/strong>)?\s*([^·<]+)/i)?.[1]?.trim() ?? null;
  const brochure = costPara.match(/href="([^"]+)"/)?.[1] ?? null;
  return { name: code ? name.replace(/\s*\([A-Z]{2,}\)\s*$/, '') : name, code, cost, brochure, html: costPara ? s.html.replace(costPara, '') : s.html };
}

/**
 * ISCEA certifications. The text is the CMS page "training/iscea"; this route lays it out:
 * the discount as a call to action, each certification as a card, and the register-interest
 * form. If the expected headings are missing, the body is shown as written.
 */
export default async function IsceaPage() {
  const r = await resolvePage('/training/iscea');
  if (r?.type !== 'page') notFound();
  const page = r.page;

  const sections = splitAtHeadings(page.body, 2);
  const programmes = findSection(sections, 'Available certification');
  const certs = programmes ? splitAtHeadings(programmes.html, 3).filter((s) => s.heading).map(certification) : [];
  const structured = Boolean(programmes && certs.length);

  // The opening section restates the page introduction; only its discount note is kept.
  const opening = structured ? findSection(sections, 'Advance your career') : undefined;
  const discount = opening ? findSection(splitAtHeadings(opening.html, 3), 'Special discount') : undefined;
  const why = structured ? findSection(sections, 'Why take') : undefined;
  const ideal = structured ? findSection(sections, 'Ideal for') : undefined;
  const rest = structured ? joinSections(sections.filter((s) => ![opening, programmes, why, ideal].includes(s) && s.heading !== null)) : page.body;

  // The page image is the ISCEA/CARISCA logo pair: shown as a banner, not behind the title.
  const logos = page.heroImage;

  return (
    <CmsPageView
      page={{ ...page, body: rest }}
      siblings={r.siblings}
      header={<PageHeader title={page.title} intro={page.summary} crumbs={crumbsFor(page)} />}
      before={
        structured && (
          <>
            {logos?.url && (
              <div className="mb-8 overflow-hidden rounded-(--radius-card) border border-line bg-white">
                {/* The image has wide empty bands above and below the logos; trim them. */}
                <Image
                  src={logos.url}
                  alt={logos.alt_text || 'ISCEA and CARISCA'}
                  width={logos.width ?? 1920}
                  height={logos.height ?? 480}
                  unoptimized={!isLibraryImage(logos.url)}
                  sizes="(min-width:896px) 56rem, 100vw"
                  className="my-[-5%] h-auto w-full"
                />
              </div>
            )}
            {discount && (
              <section aria-labelledby="discount-heading" className="flex flex-col gap-4 rounded-(--radius-card) bg-brand-900 p-6 text-white md:flex-row md:items-center md:justify-between md:p-7">
                <div className="flex gap-4">
                  <BadgePercent aria-hidden className="mt-0.5 size-8 shrink-0 text-gold" />
                  <div>
                    <h2 id="discount-heading" className="text-xl font-bold text-white">
                      {discount.heading}
                    </h2>
                    <RichText html={discount.html} className="mt-1 prose-p:text-brand-100 prose-strong:text-white" />
                  </div>
                </div>
                <ButtonLink href="#register-interest" variant="light" className="shrink-0">
                  Register your interest
                </ButtonLink>
              </section>
            )}

            <section aria-labelledby="certs-heading" className="mt-12">
              <h2 id="certs-heading" className="text-[1.75rem] font-bold">
                {programmes!.heading}
              </h2>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2">
                {certs.map((c) => (
                  <li key={c.name} className="flex flex-col rounded-(--radius-card) border border-line bg-white p-5 shadow-(--shadow-card)">
                    {c.code && <span className="w-fit rounded-full bg-brand-50 px-3 py-1 font-display text-sm font-bold tracking-wide text-brand-800">{c.code}</span>}
                    <h3 className="mt-3 text-lg leading-snug font-bold">{c.name}</h3>
                    <RichText html={c.html} className="prose-base! mt-2 flex-1 [&_p]:text-[0.95rem]" />
                    {(c.cost || c.brochure) && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                        {c.cost && (
                          <p className="font-display text-lg font-bold text-ink">
                            {c.cost}
                            <span className="sr-only"> programme cost</span>
                          </p>
                        )}
                        {c.brochure && (
                          <a href={c.brochure} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-brand-700 hover:underline">
                            <FileDown aria-hidden className="size-4" /> Brochure (PDF)
                            <span className="sr-only"> for {c.name}, opens in a new tab</span>
                          </a>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {(why || ideal) && (
              <div className="mt-12 grid gap-6 md:grid-cols-2">
                {[why, ideal].filter(Boolean).map((s) => (
                  <section key={s!.heading} className="rounded-(--radius-card) bg-surface p-6">
                    <h2 className="text-xl font-bold">{s!.heading}</h2>
                    <RichText html={s!.html} className="prose-base! mt-2" />
                  </section>
                ))}
              </div>
            )}
            <div className="mt-2" />
          </>
        )
      }
    >
      <section aria-labelledby="interest-heading" id="register-interest" className="mt-12 scroll-mt-24 rounded-(--radius-card) border border-line bg-surface p-6 md:p-8">
        <h2 id="interest-heading" className="text-2xl font-bold">
          Register your interest
        </h2>
        <p className="mt-2 mb-6 text-muted">Complete the form to receive more information and access the CARISCA certification discount.</p>
        <ContactForm
          topic="iscea_certification"
          submitLabel="Register interest"
          interest={{
            label: 'Programme of interest',
            options: [...(certs.length ? certs.map((c) => (c.code ? `${c.name} (${c.code})` : c.name)) : ['Certified Supply Chain Analyst (CSCA)', 'Certified Professional in Logistics Management (CPLM)', 'Certified Sustainable Supply Chain Professional (CSSCP)', 'Certified Healthcare Supply Chain Analyst (CHSCA)']), 'Not sure yet'],
          }}
        />
      </section>
    </CmsPageView>
  );
}
