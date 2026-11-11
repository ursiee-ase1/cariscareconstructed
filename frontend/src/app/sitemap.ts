import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { SITE_URL } from '@/lib/config';
import { getSitemapFeed } from '@/services/public';
import { isHiddenPath } from '@/lib/visibility';

const STATIC_ROUTES = ['/', '/news', '/publications', '/research', '/research/projects', '/lmi', '/events', '/training/cpd', '/newsletters', '/gallery', '/about/team', '/about/partners', '/contact'];

const PREFIX: Record<string, string> = {
  articles: '/news',
  publications: '/publications',
  events: '/events',
  projects: '/research/projects',
  staff: '/about/team',
  cpd: '/training/cpd',
  newsletters: '/newsletters',
  galleries: '/gallery',
};

/** XML sitemap of all published public content, generated from the API. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: 'weekly', priority: path === '/' ? 1 : 0.8 }));
  try {
    const feed = await getSitemapFeed();
    const seen = new Set(STATIC_ROUTES);
    for (const p of feed.pages) {
      const path = `/${p.path}`;
      if (seen.has(path) || isHiddenPath(path)) continue;
      seen.add(path);
      entries.push({ url: `${SITE_URL}${path}`, lastModified: p.updated_at, priority: 0.7 });
    }
    for (const [key, prefix] of Object.entries(PREFIX)) {
      for (const row of feed[key] ?? []) entries.push({ url: `${SITE_URL}${prefix}/${row.slug}`, lastModified: row.updated_at, priority: 0.6 });
    }
  } catch {
    // If the API is unreachable, still serve the static routes.
  }
  return entries;
}
