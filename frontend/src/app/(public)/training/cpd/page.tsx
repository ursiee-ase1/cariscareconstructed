import Link from 'next/link';
import { ArrowUpRight, CalendarDays, GraduationCap } from 'lucide-react';
import { PortalEventCard } from '@/components/cards/Cards';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { CmsImage } from '@/components/ui/CmsImage';
import { Badge, EmptyState, SectionHeading } from '@/components/ui/Typography';
import { EVENTS_SITE_URL } from '@/lib/config';
import { DELIVERY_LABELS, formatDate, formatDateRange } from '@/lib/format';
import { buildMetadata } from '@/lib/seo';
import { getPastPortalEvents, getUpcomingPortalEvents } from '@/services/events-portal';
import { getCpdProgrammes, getEvents, getSite } from '@/services/public';
import type { CpdProgramme, EventItem } from '@/types/api';

export const metadata = buildMetadata({
  title: 'CARISCA CPDs',
  description: 'Continuing professional development and executive education in supply chain management from CARISCA.',
  path: '/training/cpd',
});

/** CPDs are published and registered on the events portal under this event type. */
const PORTAL_CPD_TYPE = 'cpd';
/** Titles of CPDs in the events archive, e.g. "CPD – Supply Chain Analytics", "Continuing Professional Development …". */
const CPD_TITLE = /\bCPDs?\b|continu\w*\s+(and\s+)?professional/i;

const day = (iso: string) => iso.slice(0, 10);

/**
 * Past CPDs recorded in the website's events archive (2021 onwards). The archive has no CPD
 * type of its own (CPDs are filed as training or workshops), so they are found by title.
 */
async function getArchivedCpds(): Promise<EventItem[]> {
  const lists = await Promise.all(['CPD', 'Professional'].map((q) => getEvents({ when: 'past', q, pageSize: 50 }).catch(() => null)));
  const byId = new Map<number, EventItem>();
  for (const e of lists.flatMap((l) => l?.data ?? [])) if (CPD_TITLE.test(e.title)) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
}

function ProgrammeRow({ p, upcoming }: { p: CpdProgramme; upcoming: boolean }) {
  const next = [...p.sessions].filter((s) => new Date(s.starts_at) >= new Date()).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const last = [...p.sessions].sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
  const session = upcoming ? next : last;
  return (
    <article className="group relative grid overflow-hidden rounded-(--radius-card) border border-line bg-white shadow-(--shadow-card) md:grid-cols-[18rem_1fr]">
      <CmsImage media={p.image} slot="training" sizes="(min-width:768px) 18rem, 100vw" />
      <div className="p-6">
        <div className="flex flex-wrap gap-2">
          {session && <Badge tone={upcoming && session.registration_status === 'open' ? 'success' : 'neutral'}>{upcoming ? (session.registration_status === 'open' ? 'Registration open' : session.registration_status) : 'Past session'}</Badge>}
          {session && <Badge tone="neutral">{DELIVERY_LABELS[session.delivery_mode]}</Badge>}
        </div>
        <h3 className="mt-3 text-xl font-bold">
          <Link href={`/training/cpd/${p.slug}`} className="after:absolute after:inset-0 group-hover:text-brand-700">
            {p.title}
          </Link>
        </h3>
        {session && <p className="meta mt-1">{formatDateRange(session.starts_at, session.ends_at)}</p>}
        {p.summary && <p className="mt-3 line-clamp-3 text-muted">{p.summary}</p>}
        {p.fee_text && <p className="mt-3 text-sm font-medium text-ink">Fee: {p.fee_text}</p>}
      </div>
    </article>
  );
}

export default async function CpdPage() {
  const [programmes, { settings }, portalUpcoming, portalPast, archived] = await Promise.all([
    getCpdProgrammes(),
    getSite(),
    getUpcomingPortalEvents(12, PORTAL_CPD_TYPE),
    getPastPortalEvents(24, PORTAL_CPD_TYPE),
    getArchivedCpds(),
  ]);
  const portalUrl = settings.cpd_portal_url || `${EVENTS_SITE_URL}/`;
  const now = new Date();
  const upcoming = programmes.filter((p) => p.sessions.some((s) => new Date(s.starts_at) >= now && s.registration_status !== 'cancelled'));
  const pastProgrammes = programmes.filter((p) => !upcoming.includes(p));

  // The same CPD can be recorded more than once (a programme page, an archived event, a portal
  // event). A CPD is listed once: portal first, then the programme page, then the archive entry.
  const shownDays = new Set([...(portalPast ?? []).map((e) => day(e.startAt)), ...pastProgrammes.flatMap((p) => p.sessions.map((s) => day(s.starts_at)))]);
  const earlier = archived.filter((e) => !shownDays.has(day(e.starts_at)));
  const hasUpcoming = upcoming.length > 0 || (portalUpcoming?.length ?? 0) > 0;

  return (
    <>
      <PageHeader
        title="CARISCA CPDs"
        eyebrow="Training"
        intro="Continuing professional development and executive education for supply chain, procurement and logistics professionals."
        crumbs={[{ label: 'Training', href: '/training' }, { label: 'CPDs' }]}
      />
      <div className="container-site py-12 md:py-16">
        <div className="mb-12 flex flex-col gap-4 rounded-(--radius-card) border border-brand-100 bg-brand-50 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <p className="text-[1.05rem] text-ink">
            CPD sessions are announced and registered on the <strong>CARISCA events portal</strong>.
          </p>
          <ButtonLink href={portalUrl} size="sm" className="shrink-0">
            Visit the events portal <ArrowUpRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>

        <section aria-labelledby="upcoming-heading" id="upcoming">
          <SectionHeading id="upcoming-heading" title="Upcoming CPDs" />
          {hasUpcoming ? (
            <div className="grid gap-6">
              {portalUpcoming && portalUpcoming.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {portalUpcoming.map((e) => (
                    <PortalEventCard key={e.id} event={e} />
                  ))}
                </div>
              )}
              {upcoming.map((p) => (
                <ProgrammeRow key={p.id} p={p} upcoming />
              ))}
            </div>
          ) : (
            <EmptyState title="No CPD sessions are scheduled at the moment." icon={<GraduationCap className="size-6" />}>
              <p>{portalUpcoming ? 'New sessions are published on the CARISCA events portal and announced in our news and newsletter.' : 'Upcoming sessions could not be loaded right now. Please check the CARISCA events portal.'}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <ButtonLink href={portalUrl} size="sm">
                  CARISCA events portal
                </ButtonLink>
                <ButtonLink href="/training/iscea" size="sm" variant="secondary">
                  ISCEA certifications
                </ButtonLink>
              </div>
            </EmptyState>
          )}
        </section>

        {portalPast && portalPast.length > 0 && (
          <section aria-labelledby="recent-heading" className="mt-16">
            <SectionHeading id="recent-heading" title="Recent CPDs" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {portalPast.map((e) => (
                <PortalEventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}

        {(pastProgrammes.length > 0 || earlier.length > 0) && (
          <section aria-labelledby="past-heading" className="mt-16">
            <SectionHeading id="past-heading" title="Earlier CPDs" />
            {pastProgrammes.length > 0 && (
              <div className="grid gap-6">
                {pastProgrammes.map((p) => (
                  <ProgrammeRow key={p.id} p={p} upcoming={false} />
                ))}
              </div>
            )}
            {earlier.length > 0 && (
              <ul className={`divide-y divide-line rounded-(--radius-card) border border-line bg-white ${pastProgrammes.length ? 'mt-6' : ''}`}>
                {earlier.map((e) => (
                  <li key={e.id} className="group relative flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6 md:px-6">
                    <time dateTime={e.starts_at} className="flex shrink-0 items-center gap-2 text-sm text-muted sm:w-40">
                      <CalendarDays aria-hidden className="size-4 text-brand-600" />
                      {formatDate(e.starts_at)}
                    </time>
                    <Link href={`/events/${e.slug}`} className="font-semibold text-ink after:absolute after:inset-0 group-hover:text-brand-700">
                      {e.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
