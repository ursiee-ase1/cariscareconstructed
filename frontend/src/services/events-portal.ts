import 'server-only';
import { EVENTS_API_URL, EVENTS_SITE_URL } from '@/lib/config';

/** Upcoming events are refreshed from the events portal at most this often. */
const REVALIDATE_SECONDS = 600;

/** The subset of the events portal's public event record that the website uses. */
interface PortalEventRecord {
  id: string;
  slug: string;
  type?: { key: string; name: string } | null;
  title: string;
  shortDescription?: string | null;
  startAt: string;
  endAt?: string | null;
  deliveryMode?: 'ONLINE' | 'IN_PERSON' | 'HYBRID' | string | null;
  location?: { city?: string | null; country?: string | null; venue?: string | null } | null;
  status?: string | null;
  banner?: { url: string; visibility?: string } | null;
  prices?: Array<{ money: { amountMinor: number; currency: string; formatted: string } }> | null;
}

export interface PortalEvent {
  id: string;
  title: string;
  typeName: string | null;
  summary: string | null;
  startAt: string;
  endAt: string | null;
  online: boolean;
  where: string | null;
  fee: string | null;
  registrationOpen: boolean;
  /** The event has finished. */
  ended: boolean;
  bannerUrl: string | null;
  url: string;
}

/** Lowest price, preferring Ghana cedis when the event is priced in several currencies. */
function lowestFee(prices: PortalEventRecord['prices']) {
  if (!prices?.length) return null;
  const ghs = prices.filter((p) => p.money.currency === 'GHS');
  const pool = ghs.length ? ghs : prices.filter((p) => p.money.currency === prices[0].money.currency);
  const min = pool.reduce((a, b) => (b.money.amountMinor < a.money.amountMinor ? b : a));
  if (min.money.amountMinor === 0) return 'Free';
  return `${pool.length > 1 ? 'From ' : ''}${min.money.currency} ${min.money.formatted}`;
}

function toPortalEvent(e: PortalEventRecord): PortalEvent {
  const online = e.deliveryMode === 'ONLINE';
  const place = [e.location?.venue, e.location?.city, e.location?.country].filter(Boolean).join(', ');
  const where = online ? 'Online' : [place, e.deliveryMode === 'HYBRID' ? 'In person & online' : ''].filter(Boolean).join(' · ');
  return {
    id: e.id,
    title: e.title,
    typeName: e.type?.name ?? null,
    summary: e.shortDescription ?? null,
    startAt: e.startAt,
    endAt: e.endAt ?? null,
    online,
    where: where || null,
    fee: lowestFee(e.prices),
    // The portal can leave registration "open" on an event that has already taken place.
    registrationOpen: e.status === 'REGISTRATION_OPEN' && new Date(e.endAt ?? e.startAt).getTime() >= Date.now(),
    ended: new Date(e.endAt ?? e.startAt).getTime() < Date.now(),
    bannerUrl: e.banner?.url && e.banner.visibility !== 'PRIVATE' ? `${EVENTS_API_URL}${e.banner.url}` : null,
    url: `${EVENTS_SITE_URL}/events/${encodeURIComponent(e.slug)}`,
  };
}

/** Fetches one listing from the portal's public API; null when the portal cannot be reached. */
async function fetchPortalEvents(query: string): Promise<PortalEventRecord[] | null> {
  try {
    const res = await fetch(`${EVENTS_API_URL}/events?${query}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS, tags: ['portal-events'] },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: PortalEventRecord[] };
    return body.data ?? [];
  } catch {
    return null;
  }
}

/**
 * Upcoming events from the events portal, soonest first. Returns null when the portal cannot be
 * reached, so the homepage can still render and point visitors to the portal instead.
 */
export async function getUpcomingPortalEvents(limit = 3): Promise<PortalEvent[] | null> {
  const records = await fetchPortalEvents('limit=12');
  if (!records) return null;
  const now = Date.now();
  return records
    .filter((e) => new Date(e.endAt ?? e.startAt).getTime() >= now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, limit)
    .map(toPortalEvent);
}

/**
 * Events that have taken place on the events portal (its "when=past" listing), most recent first.
 * Returns null when the portal cannot be reached.
 */
export async function getPastPortalEvents(limit = 12): Promise<PortalEvent[] | null> {
  const records = await fetchPortalEvents(`when=past&limit=${limit}`);
  if (!records) return null;
  return records.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()).map(toPortalEvent);
}
