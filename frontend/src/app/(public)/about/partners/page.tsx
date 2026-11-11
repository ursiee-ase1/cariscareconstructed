import { PageHeader } from '@/components/layout/PageHeader';
import { CmsImage } from '@/components/ui/CmsImage';
import { SmartLink } from '@/components/ui/SmartLink';
import { EmptyState } from '@/components/ui/Typography';
import { FALLBACK_PARTNERS } from '@/lib/fallback-content';
import { buildMetadata } from '@/lib/seo';
import { getPartners } from '@/services/public';
import type { Partner } from '@/types/api';

export const metadata = buildMetadata({ title: 'Partners', description: 'Institutions and organisations that CARISCA works with.', path: '/about/partners' });

const TYPE_LABELS: Record<Partner['partner_type'], string> = {
  host: 'Host institution',
  funder: 'Funding partner',
  academic: 'Academic partners',
  industry: 'Industry partners',
  public_sector: 'Public sector partners',
  professional_body: 'Professional bodies',
  other: 'Other partners',
};

export default async function PartnersPage() {
  // If the content API cannot be reached (after a retry), show the verified current partners rather
  // than an error page; the live records are used again as soon as the API responds.
  const partners = await getPartners().catch(() => FALLBACK_PARTNERS);
  const groups = (Object.keys(TYPE_LABELS) as Partner['partner_type'][])
    .map((t) => ({ type: t, items: partners.filter((p) => p.partner_type === t) }))
    .filter((g) => g.items.length);
  return (
    <>
      <PageHeader
        title="Partners"
        eyebrow="About CARISCA"
        intro="CARISCA leverages a local and international network of governmental, civil society, and industry partners."
        crumbs={[{ label: 'About', href: '/about' }, { label: 'Partners' }]}
      />
      <div className="container-site py-12 md:py-16">
        {groups.length === 0 && <EmptyState title="Partner information is being updated." />}
        {groups.map((g) => (
          <section key={g.type} className="mb-14 last:mb-0" aria-labelledby={`p-${g.type}`}>
            <h2 id={`p-${g.type}`} className="text-2xl font-bold">
              {TYPE_LABELS[g.type]}
            </h2>
            <ul className="mt-6 grid gap-6 md:grid-cols-2">
              {g.items.map((p) => (
                <li key={p.id} className="grid gap-5 rounded-(--radius-card) border border-line bg-white p-5 sm:grid-cols-[10rem_1fr]">
                  <CmsImage media={p.logo} slot="partnerLogo" alt={p.logo ? `${p.name} logo` : undefined} sizes="160px" />
                  <div>
                    <h3 className="text-lg font-bold">{p.name}</h3>
                    {p.description && <p className="mt-2 text-[0.95rem] text-muted">{p.description}</p>}
                    {p.website_url && (
                      <SmartLink href={p.website_url} className="link mt-3 inline-block" showExternalIcon>
                        Visit website
                      </SmartLink>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
