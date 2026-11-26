import { Router } from 'express';
import { Op, type Model, type ModelStatic } from 'sequelize';
import { z } from 'zod';
import { Article, CpdProgramme, Event, Page, Publication, ResearchProject, sequelize } from '../../models';
import { stripHtml } from '../../utils/html';
import { livePublished } from '../../utils/serialize';
import { pageMeta } from '../../validators/common';

export const publicSearchRouter = Router();

interface SearchSource {
  type: string;
  model: ModelStatic<Model>;
  /** Columns covered by the table's FULLTEXT index (must match the migration exactly). */
  fulltext: string[];
  attributes: string[];
  url: (row: Record<string, unknown>) => string;
  title: (row: Record<string, unknown>) => string;
  /** Text columns to quote from, in order of preference. */
  snippet: string[];
  date: (row: Record<string, unknown>) => unknown;
}

const SOURCES: SearchSource[] = [
  {
    type: 'news',
    model: Article,
    fulltext: ['title', 'excerpt', 'body'],
    attributes: ['id', 'title', 'slug', 'excerpt', 'body', 'type', 'published_at'],
    url: (r) => `/news/${r.slug}`,
    title: (r) => String(r.title),
    snippet: ['excerpt', 'body'],
    date: (r) => r.published_at,
  },
  {
    type: 'publication',
    model: Publication,
    fulltext: ['title', 'authors', 'abstract'],
    attributes: ['id', 'title', 'slug', 'abstract', 'authors', 'type', 'publication_year', 'published_at'],
    url: (r) => `/publications/${r.slug}`,
    title: (r) => String(r.title),
    snippet: ['abstract', 'authors'],
    date: (r) => r.publication_year,
  },
  {
    type: 'event',
    model: Event,
    fulltext: ['title', 'summary', 'body'],
    attributes: ['id', 'title', 'slug', 'summary', 'body', 'starts_at', 'venue'],
    url: (r) => `/events/${r.slug}`,
    title: (r) => String(r.title),
    snippet: ['summary', 'body'],
    date: (r) => r.starts_at,
  },
  {
    type: 'page',
    model: Page,
    fulltext: ['title', 'summary', 'body'],
    attributes: ['id', 'title', 'path', 'summary', 'body', 'updated_at'],
    url: (r) => `/${r.path}`,
    title: (r) => String(r.title),
    snippet: ['summary', 'body'],
    date: () => null,
  },
  {
    type: 'research',
    model: ResearchProject,
    fulltext: ['title', 'summary', 'body'],
    attributes: ['id', 'title', 'slug', 'summary', 'body', 'published_at'],
    url: (r) => `/research/projects/${r.slug}`,
    title: (r) => String(r.title),
    snippet: ['summary', 'body'],
    date: () => null,
  },
  {
    type: 'training',
    model: CpdProgramme,
    fulltext: ['title', 'summary', 'description'],
    attributes: ['id', 'title', 'slug', 'summary', 'description', 'published_at'],
    url: (r) => `/training/cpd/${r.slug}`,
    title: (r) => String(r.title),
    snippet: ['summary', 'description'],
    date: () => null,
  },
];

/** The searchable words of a query (lower case, punctuation removed). */
function queryWords(q: string) {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 8);
}

/** Builds a safe InnoDB boolean-mode query: every word required, prefix-matched. */
function toBooleanQuery(q: string) {
  const words = queryWords(q);
  return words.length ? words.map((w) => `+${w}*`).join(' ') : null;
}

const SNIPPET_LENGTH = 220;
/** Characters of context kept before the first match. */
const SNIPPET_LEAD = 70;

/**
 * Quotes the passage around the first place the query appears (so the matched words can be
 * highlighted), trying each column in turn; falls back to the start of the first non-empty one.
 */
export function makeSnippet(row: Record<string, unknown>, columns: string[], q: string) {
  const words = queryWords(q);
  if (!words.length) words.push(q.trim().toLowerCase());
  const texts = columns.map((c) => stripHtml(row[c] as string | null)).filter(Boolean);
  for (const text of texts) {
    const lower = text.toLowerCase();
    const at = Math.min(...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0));
    if (!Number.isFinite(at)) continue;
    if (text.length <= SNIPPET_LENGTH) return text;
    // Start at a word boundary shortly before the match.
    let start = Math.max(0, at - SNIPPET_LEAD);
    if (start > 0) start = text.indexOf(' ', start) + 1 || start;
    if (start > at) start = at;
    let end = Math.min(text.length, start + SNIPPET_LENGTH);
    if (end < text.length) end = text.lastIndexOf(' ', end) > at ? text.lastIndexOf(' ', end) : end;
    return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
  }
  return texts.length ? stripHtml(texts[0], SNIPPET_LENGTH) : '';
}

const querySchema = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters').max(200),
  type: z.enum(['all', ...SOURCES.map((s) => s.type)] as [string, ...string[]]).default('all'),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(10),
});

async function searchSource(src: SearchSource, q: string, limit: number, offset: number) {
  const boolean = toBooleanQuery(q);
  // Sequelize aliases the table by its model name in generated SQL.
  const table = src.model.name;
  const cols = src.fulltext.map((c) => `\`${table}\`.\`${c}\``).join(', ');
  const match = boolean ? sequelize.literal(`MATCH (${cols}) AGAINST (${sequelize.escape(boolean)} IN BOOLEAN MODE)`) : null;
  const where = {
    ...livePublished(),
    ...(match
      ? { [Op.and]: [sequelize.where(match, Op.gt, 0)] }
      : { [Op.or]: src.fulltext.map((c) => ({ [c]: { [Op.like]: `%${q}%` } })) }),
  };
  const { rows, count } = await src.model.findAndCountAll({
    where,
    attributes: match ? [...src.attributes, [match, 'score']] : src.attributes,
    order: match ? [[sequelize.literal('score'), 'DESC']] : [['id', 'DESC']],
    limit,
    offset,
    raw: true,
  });
  return {
    total: count,
    results: (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
      type: src.type,
      title: src.title(r),
      url: src.url(r),
      snippet: makeSnippet(r, src.snippet, q),
      date: src.date(r) ?? null,
      score: Number(r.score ?? 0),
    })),
  };
}

publicSearchRouter.get('/search', async (req, res) => {
  const q = querySchema.parse(req.query);
  if (q.type !== 'all') {
    const src = SOURCES.find((s) => s.type === q.type)!;
    const { results, total } = await searchSource(src, q.q, q.pageSize, (q.page - 1) * q.pageSize);
    return res.json({ data: { query: q.q, type: q.type, results, counts: { [q.type]: total } }, meta: pageMeta(q.page, q.pageSize, total) });
  }
  // "All": top results from each type, merged by relevance, with per-type totals for the tabs.
  const perType = await Promise.all(SOURCES.map((s) => searchSource(s, q.q, 5, 0)));
  const counts = Object.fromEntries(SOURCES.map((s, i) => [s.type, perType[i].total]));
  const results = perType.flatMap((p) => p.results).sort((a, b) => b.score - a.score).slice(0, 20);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  res.json({ data: { query: q.q, type: 'all', results, counts }, meta: pageMeta(1, results.length || 1, total) });
});
