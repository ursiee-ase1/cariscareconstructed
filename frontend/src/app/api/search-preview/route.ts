import { NextResponse, type NextRequest } from 'next/server';
import { MIN_QUERY_LENGTH } from '@/lib/search';
import { search } from '@/services/public';

/** Number of results shown in the search-as-you-type preview. */
const PREVIEW_SIZE = 6;

/**
 * Search-as-you-type preview for the header search box. Proxies the content API's search (cached
 * for a minute per query) so the browser only ever talks to this site, and returns the top results.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 200);
  if (q.length < MIN_QUERY_LENGTH) return NextResponse.json({ query: q, results: [], total: 0 });
  try {
    const res = await search({ q });
    const results = res.data.results.slice(0, PREVIEW_SIZE).map(({ type, title, url, snippet }) => ({ type, title, url, snippet }));
    return NextResponse.json({ query: q, results, total: res.meta.total }, { headers: { 'cache-control': 'private, max-age=60' } });
  } catch {
    return NextResponse.json({ error: 'Search is unavailable right now.' }, { status: 503 });
  }
}
