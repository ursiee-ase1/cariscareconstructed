import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarDays, Mail, MapPin, Megaphone, Monitor, Users } from 'lucide-react';
import { ArticleListItem, ProjectCard } from '@/components/cards/Cards';
import { crumbsFor } from '@/components/layout/CmsPageView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, EmptyState, RichText } from '@/components/ui/Typography';
import { DELIVERY_LABELS, formatDate, formatDateRange } from '@/lib/format';
import { buildMetadata } from '@/lib/seo';
import { getArticles, getAsnRaProjects, getEvents, resolvePage } from '@/services/public';
import type { EventItem } from '@/types/api';

/**
 * Africa Supply Network Research Accelerator (ASN-RA).
 *
 * One page brings together everything about ASN-RA:
 *  - About, Members and Contact come from the CMS page "asn-ra" (Admin › Pages). Its body is split
 *    at each <h2>: a heading containing "member" fills Members, "question", "contact" or "enquir"
 *    fills Contact, "announce" / "meeting" add an introduction to those sections, and anything
 *    else stays under About. A "projects" section in the body is ignored (projects are listed below).
 *  - Research projects: research projects whose Programme is "ASN-RA" (Admin › Research projects).
 *  - Announcements: news items whose title or summary mentions "ASN-RA" (Admin › News).
 *  - Meetings: events whose title mentions "ASN-RA" (Admin › Events).
 */
const PATH = '/asn-ra';
const KEYWORD = 'ASN-RA';

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'members', label: 'Members' },
  { id: 'research-projects', label: 'Research projects' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'contact', label: 'Contact' },
] as const;

type BodyParts = { about: string; members: string; announcements: string; meetings: string; contact: string; contactHeading: string | null };

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Splits the CMS body into the page's sections at each <h2> (headings are rendered by the page). */
function splitBody(html: string | null | undefined): BodyParts {
  const parts: BodyParts = { about: '', members: '', announcements: '', meetings: '', contact: '', contactHeading: null };
  if (!html) return parts;
  const chunks = html.split(/(?=<h2[\s>])/i);
  for (const chunk of chunks) {
    const m = chunk.match(/^<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const heading = m ? decode(m[1]) : '';
    const content = m ? chunk.slice(m[0].length).trim() : chunk.trim();
    if (!content && !heading) continue;
    if (/^about\b/i.test(heading) || !m) parts.about += content;
    else if (/member/i.test(heading)) parts.members += content;
    else if (/project/i.test(heading)) continue;
    else if (/announce/i.test(heading)) parts.announcements += content;
    else if (/meeting/i.test(heading)) parts.meetings += content;
    else if (/question|contact|enquir/i.test(heading)) {
      parts.contact += content;
      parts.contactHeading ??= heading;
    } else parts.about += chunk; // keep any other section, with its own heading, under About
  }
  return parts;
}

type Member = { name: string; university: string; country: string };

/** Reads the Name | University | Country table; returns null if the table is in another shape. */
function parseMembers(html: string): Member[] | null {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((r) => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => decode(c[1])))
    .filter((cells) => cells.length >= 3 && cells[0]);
  if (!rows.length) return null;
  return rows.map(([name, university, country]) => ({ name, university, country }));
}

export async function generateMetadata(): Promise<Metadata> {
  const r = await resolvePage(PATH);
  const p = r?.type === 'page' ? r.page : null;
  return buildMetadata({
    title: p?.seo_title || p?.title || 'Africa Supply Network Research Accelerator (ASN-RA)',
    description: p?.seo_description || p?.summary,
    path: PATH,
    image: p?.ogImage ?? p?.heroImage,
  });
}

function SectionTitle({ id, eyebrow, title, intro }: { id: string; eyebrow?: string; title: string; intro?: string }) {
  return (
    <div className="mb-7 max-w-3xl">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h2 id={`${id}-heading`} className="text-[1.6rem] leading-tight font-bold md:text-[2rem]">
        {title}
      </h2>
      {intro && <p className="mt-3 text-lg text-muted">{intro}</p>}
    </div>
  );
}

function MeetingItem({ event, now }: { event: EventItem; now: number }) {
  const start = new Date(event.starts_at);
  const upcoming = new Date(event.ends_at ?? event.starts_at).getTime() >= now;
  const Where = event.location_type === 'online' ? Monitor : MapPin;
  return (
    <li className="group relative flex gap-5 rounded-(--radius-card) border border-line bg-white p-5 shadow-(--shadow-card) transition hover:border-brand-200 md:p-6">
      <div className="flex w-16 shrink-0 flex-col items-center self-start rounded-(--radius-control) bg-brand-900 py-2.5 text-center font-display text-white">
        <span className="text-2xl leading-none font-bold">{start.getUTCDate()}</span>
        <span className="mt-1 text-xs font-semibold tracking-wide uppercase">{formatDate(event.starts_at, { day: undefined, year: undefined, month: 'short' })}</span>
        <span className="text-[0.72rem] text-brand-200">{start.getUTCFullYear()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={upcoming ? 'success' : 'neutral'}>{upcoming ? 'Upcoming' : 'Past meeting'}</Badge>
          <Badge tone="sky">{DELIVERY_LABELS[event.location_type]}</Badge>
        </div>
        <h3 className="mt-2.5 text-[1.15rem] leading-snug font-bold">
          <Link href={`/events/${event.slug}`} className="after:absolute after:inset-0 group-hover:text-brand-700">
            {event.title}
          </Link>
        </h3>
        <ul className="mt-2 space-y-1 text-[0.95rem] text-muted">
          <li className="flex gap-2">
            <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <time dateTime={event.starts_at}>{formatDateRange(event.starts_at, event.ends_at, event.all_day)}</time>
          </li>
          {event.venue && (
            <li className="flex gap-2">
              <Where aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
              {event.venue}
            </li>
          )}
        </ul>
        {event.summary && <p className="mt-3 text-[0.98rem]">{event.summary}</p>}
      </div>
    </li>
  );
}

export default async function AsnRaPage() {
  const r = await resolvePage(PATH);
  if (!r) notFound();
  if (r.type !== 'page') notFound();
  const page = r.page;

  const [projects, announcements, meetings, now] = await Promise.all([
    getAsnRaProjects().catch(() => []),
    getArticles({ q: KEYWORD, pageSize: 6 })
      .then((l) => l.data)
      .catch(() => []),
    getEvents({ when: 'all', q: KEYWORD, pageSize: 20 })
      .then((l) => l.data.sort((a, b) => b.starts_at.localeCompare(a.starts_at)))
      .catch(() => []),
    // Rendered on request; the time is read once here so the meeting cards stay pure.
    Promise.resolve(new Date().getTime()),
  ]);

  const body = splitBody(page.body);
  const members = parseMembers(body.members);
  const byCountry = members
    ? [...members.reduce((map, m) => map.set(m.country, [...(map.get(m.country) ?? []), m]), new Map<string, Member[]>())].sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <>
      <PageHeader title={page.title} intro={page.summary} crumbs={[{ label: 'Research', href: '/research' }, ...crumbsFor({ ...page, parent: null })]} image={page.heroImage} />

      {/* In-page navigation */}
      <nav aria-label="On this page" className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85">
        <div className="container-site">
          <ul className="-mx-1 flex gap-1 overflow-x-auto py-2.5 scrollbar-none">
            {SECTIONS.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#${s.id}`} className="block rounded-(--radius-control) px-3.5 py-2 font-display text-[0.92rem] font-semibold text-brand-800 transition-colors hover:bg-brand-50">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* 1. About */}
      <section id="about" aria-labelledby="about-heading" className="scroll-mt-20 py-12 md:py-16">
        <div className="container-site">
          <div className="mx-auto max-w-4xl">
            <SectionTitle id="about" eyebrow="Africa Supply Network Research Accelerator" title="About ASN-RA" />
            <RichText html={body.about} />
          </div>
        </div>
      </section>

      {/* 2. Members */}
      <section id="members" aria-labelledby="members-heading" className="scroll-mt-20 border-t border-line bg-surface py-12 md:py-16">
        <div className="container-site">
          <SectionTitle id="members" eyebrow="The network" title="Members" intro={members ? `${members.length} researchers from universities across Africa.` : undefined} />
          {members ? (
            <div className="gap-5 sm:columns-2 lg:columns-3">
              {byCountry.map(([country, people]) => (
                <section key={country} aria-label={country} className="mb-5 break-inside-avoid rounded-(--radius-card) border border-line bg-white p-5 shadow-(--shadow-card)">
                  <h3 className="flex items-center justify-between gap-3 border-b border-line pb-3 text-base font-bold text-brand-900">
                    {country}
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{people.length}</span>
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {people.map((m) => (
                      <li key={m.name}>
                        <p className="font-semibold text-ink">{m.name}</p>
                        <p className="text-sm text-muted">{m.university}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : body.members ? (
            <RichText html={body.members} />
          ) : (
            <EmptyState title="Member information is being updated." icon={<Users className="size-6" />} />
          )}
        </div>
      </section>

      {/* 3. Research projects */}
      <section id="research-projects" aria-labelledby="research-projects-heading" className="scroll-mt-20 border-t border-line py-12 md:py-16">
        <div className="container-site">
          <SectionTitle
            id="research-projects"
            eyebrow="Research"
            title="Research projects"
            intro="Collaborative ASN-RA team projects, each working towards publication in top-tier, peer-reviewed journals."
          />
          {projects.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <EmptyState title="ASN-RA projects will be listed here." />
          )}
        </div>
      </section>

      {/* 4. Announcements */}
      <section id="announcements" aria-labelledby="announcements-heading" className="scroll-mt-20 border-t border-line bg-surface py-12 md:py-16">
        <div className="container-site grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <SectionTitle id="announcements" eyebrow="News & opportunities" title="Announcements" />
            <RichText html={body.announcements} className="mb-6" />
            {announcements.length ? (
              <div className="rounded-(--radius-card) border border-line bg-white px-5 py-1 shadow-(--shadow-card) md:px-6">
                {announcements.map((a) => (
                  <ArticleListItem key={a.id} article={a} />
                ))}
              </div>
            ) : (
              <EmptyState title="There are no ASN-RA announcements at the moment." icon={<Megaphone className="size-6" />} />
            )}
          </div>
          <aside className="self-start rounded-(--radius-card) border border-line bg-white p-5 lg:mt-[4.4rem]">
            <p className="font-display font-bold text-ink">Calls and opportunities</p>
            <p className="mt-2 text-[0.95rem] text-muted">Calls for applications, papers and other opportunities from across CARISCA are published with our announcements.</p>
            <Link href="/news?type=announcement,call" className="mt-4 inline-flex items-center gap-1.5 font-display text-sm font-semibold text-brand-700 hover:text-brand-900">
              All announcements &amp; calls <ArrowRight aria-hidden className="size-4" />
            </Link>
          </aside>
        </div>
      </section>

      {/* 5. Meetings */}
      <section id="meetings" aria-labelledby="meetings-heading" className="scroll-mt-20 border-t border-line py-12 md:py-16">
        <div className="container-site">
          <SectionTitle id="meetings" eyebrow="Convenings" title="Meetings" intro="The ASN-RA meeting is held biennially, rotating among partner institutions across Africa; teams also meet periodically between meetings." />
          <RichText html={body.meetings} className="mb-6" />
          {meetings.length ? (
            <ul className="grid gap-5 lg:grid-cols-2">
              {meetings.map((e) => (
                <MeetingItem key={e.id} event={e} now={now} />
              ))}
            </ul>
          ) : (
            <EmptyState title="ASN-RA meetings will be listed here." icon={<CalendarDays className="size-6" />} />
          )}
        </div>
      </section>

      {/* 6. Contact / enquiries */}
      <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-20 border-t border-line bg-brand-900 py-12 text-white md:py-16">
        <div className="container-site grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="max-w-2xl">
            <p className="font-display text-sm font-semibold tracking-[0.12em] text-sky-accent uppercase">Contact &amp; enquiries</p>
            <h2 id="contact-heading" className="mt-2 text-[1.6rem] leading-tight font-bold text-white md:text-[2rem]">
              {body.contactHeading ?? 'Got questions?'}
            </h2>
            {body.contact && (
              <div className="mt-4 text-lg text-brand-100 [&_a]:font-semibold [&_a]:text-white [&_a]:underline [&_a]:decoration-sky-accent [&_a]:decoration-2 [&_a]:underline-offset-4 [&_p]:mt-2">
                <div dangerouslySetInnerHTML={{ __html: body.contact }} />
              </div>
            )}
            <p className="mt-4 text-[0.95rem] text-brand-200">
              For general enquiries about CARISCA, please use our{' '}
              <Link href="/contact" className="font-semibold text-white underline decoration-sky-accent decoration-2 underline-offset-4">
                contact page
              </Link>
              .
            </p>
          </div>
          <Mail aria-hidden className="hidden size-20 text-white/15 md:block" strokeWidth={1.25} />
        </div>
      </section>
    </>
  );
}
