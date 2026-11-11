import Link from 'next/link';
import { ArrowRight, CalendarX } from 'lucide-react';
import { EventCard, PortalEventCard } from '@/components/cards/Cards';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar, ResultCount, firstParam, pageParam } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { SmartLink } from '@/components/ui/SmartLink';
import { EmptyState } from '@/components/ui/Typography';
import { EVENTS_PAGE_SUMMIT, EVENTS_SITE_URL } from '@/lib/config';
import { EVENT_TYPE_LABELS } from '@/lib/format';
import { buildMetadata } from '@/lib/seo';
import { getPastPortalEvents, getUpcomingPortalEvents } from '@/services/events-portal';
import { getEvents } from '@/services/public';
import type { EventType } from '@/types/api';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata = buildMetadata({
  title: 'Events & Conferences',
  description: 'Upcoming and past CARISCA events: Supply Chain Research Summits, workshops, Distinguished Lecture Series, CPD training and stakeholder meetings.',
  path: '/events',
});

export default async function EventsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const when = firstParam(sp.when) === 'past' ? 'past' : 'upcoming';
  const page = pageParam(sp.page);
  const type = firstParam(sp.type) as EventType | undefined;
  const q = firstParam(sp.q)?.slice(0, 200);
  const year = Number(firstParam(sp.year)) || undefined;
  // Upcoming events live on the events portal (registration). Past events come from two places:
  // the portal's own "when=past" listing (events run through the portal) and this site's archive of
  // earlier events (CMS). Each source can fail on its own without taking the page down.
  const filtered = Boolean(type || q || year || page > 1);
  const [archive, portalEvents, portalPast] = await Promise.all([
    when === 'past' ? getEvents({ when, page, pageSize: 10, type, q, year }).catch(() => 'unavailable' as const) : null,
    when === 'upcoming' ? getUpcomingPortalEvents(12) : null,
    when === 'past' && !filtered ? getPastPortalEvents(12) : null,
  ]);
  const list = archive === 'unavailable' ? null : archive;
  const now = new Date().getUTCFullYear();

  const tab = (value: 'upcoming' | 'past', label: string) => (
    <Link
      href={value === 'upcoming' ? '/events' : '/events?when=past'}
      aria-current={when === value ? 'page' : undefined}
      className={`-mb-px border-b-3 px-4 py-3 font-display text-lg font-semibold ${when === value ? 'border-brand-700 text-brand-800' : 'border-transparent text-muted hover:text-brand-700'}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader title="Events & Conferences" eyebrow="News & events" intro="Summits, workshops, lectures, training and stakeholder engagements." crumbs={[{ label: 'Events' }]} />
      <div className="container-site py-12 md:py-16">
        <nav aria-label="Event listings" className="mb-8 flex gap-2 border-b border-line">
          {tab('upcoming', 'Upcoming')}
          {tab('past', 'Past events')}
        </nav>
        {portalPast && portalPast.length > 0 && (
          <section aria-labelledby="recent-past-heading" className="mb-12">
            <h2 id="recent-past-heading" className="text-[1.4rem] font-bold">
              Recent events
            </h2>
            <p className="mt-1 mb-6 text-muted">
              Events held through the{' '}
              <SmartLink href={`${EVENTS_SITE_URL}/events?when=past`} className="link">
                CARISCA events portal
              </SmartLink>
              .
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {portalPast.map((e) => (
                <PortalEventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}
        {when === 'past' && !filtered && (
          <h2 className="mb-5 text-[1.4rem] font-bold">Events archive</h2>
        )}
        {when === 'past' && (
          <FilterBar
            action="/events"
            q={q}
            searchLabel="Search past events"
            hidden={{ when: 'past' }}
            selects={[
              {
                name: 'type',
                label: 'Type',
                value: type,
                allLabel: 'All types',
                options: Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              },
              {
                name: 'year',
                label: 'Year',
                value: year ? String(year) : undefined,
                allLabel: 'Any year',
                options: Array.from({ length: now - 2019 }, (_, i) => String(now - i)).map((y) => ({ value: y, label: y })),
              },
            ]}
          />
        )}
        {list && <ResultCount {...list.meta} noun="events" />}
        {list?.data.length ? (
          <div className="grid gap-6">
            {list.data.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : portalEvents?.length ? (
          <>
            <p className="mb-6 text-muted">
              Registration for CARISCA events is handled on the{' '}
              <SmartLink href={`${EVENTS_SITE_URL}/events`} className="link">
                CARISCA events portal
              </SmartLink>
              .
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {portalEvents.map((e) => (
                <PortalEventCard key={e.id} event={e} />
              ))}
            </div>
          </>
        ) : archive === 'unavailable' ? (
          <EmptyState title="The events archive could not be loaded just now." icon={<CalendarX className="size-6" />}>
            <p>
              Please refresh the page in a moment. Recent events are also listed on the{' '}
              <SmartLink href={`${EVENTS_SITE_URL}/events?when=past`} className="link">
                CARISCA events portal
              </SmartLink>
              .
            </p>
          </EmptyState>
        ) : when === 'upcoming' ? (
          <EmptyState title={portalEvents ? 'There are no upcoming events at the moment.' : 'Upcoming events could not be loaded right now.'} icon={<CalendarX className="size-6" />}>
            <p>
              Visit the{' '}
              <SmartLink href={`${EVENTS_SITE_URL}/events`} className="link">
                CARISCA events portal
              </SmartLink>
              , or browse <Link href="/events?when=past" className="link">past events</Link>.
            </p>
            <p className="mt-4">
              <SmartLink href={EVENTS_PAGE_SUMMIT.url} className="inline-flex items-center gap-1.5 font-display font-semibold text-brand-700 hover:text-brand-900">
                Visit the {EVENTS_PAGE_SUMMIT.label} page <ArrowRight aria-hidden className="size-4" />
              </SmartLink>
            </p>
          </EmptyState>
        ) : (
          <EmptyState title="No past events match these filters." />
        )}
        {list && <Pagination meta={list.meta} basePath="/events" params={{ when: when === 'past' ? 'past' : undefined, type, q, year: year ? String(year) : undefined }} />}
      </div>
    </>
  );
}
