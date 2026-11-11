import 'server-only';
import { CONTENT_REVALIDATE_SECONDS, SERVER_API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Per-attempt time limits for API requests (one retry after a timeout or gateway error). */
const FIRST_ATTEMPT_MS = 10_000;
const RETRY_ATTEMPT_MS = 12_000;
const RETRY_STATUSES = new Set([502, 503, 504]);

type Query = Record<string, string | number | boolean | undefined | null>;

export function buildQuery(query?: Query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  const s = params.toString();
  return s ? `?${s}` : '';
}

/**
 * Server-side GET against the public API. Responses are cached in the Next.js data cache, tagged
 * so the backend can purge them on publish, and refreshed after CONTENT_REVALIDATE_SECONDS anyway.
 */
export async function apiGet<T>(
  path: string,
  opts: { query?: Query; tags?: string[]; revalidate?: number } = {},
): Promise<T> {
  const url = `${SERVER_API_BASE_URL}${path}${buildQuery(opts.query)}`;
  const request = (timeoutMs: number) =>
    fetch(url, {
      headers: { accept: 'application/json' },
      next: { revalidate: opts.revalidate ?? CONTENT_REVALIDATE_SECONDS, tags: opts.tags ?? [] },
      signal: AbortSignal.timeout(timeoutMs),
    });
  let res: Response;
  try {
    res = await request(FIRST_ATTEMPT_MS);
    // A gateway error is usually momentary (e.g. the API restarting): try once more.
    if (RETRY_STATUSES.has(res.status)) res = await request(RETRY_ATTEMPT_MS);
  } catch {
    // The API (or its database connection) occasionally stalls for longer than a visitor should wait
    // on one request; a fresh request normally succeeds straight away, so retry once before failing.
    try {
      res = await request(RETRY_ATTEMPT_MS);
    } catch (err) {
      throw new ApiError(503, `The content service is unreachable (${(err as Error).message}).`);
    }
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = ((await res.json()) as { error?: { message?: string } }).error?.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

/** Like apiGet but resolves to null on 404 so pages can call notFound(). */
export async function apiGetOrNull<T>(path: string, opts?: Parameters<typeof apiGet>[1]): Promise<T | null> {
  try {
    return await apiGet<T>(path, opts);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
