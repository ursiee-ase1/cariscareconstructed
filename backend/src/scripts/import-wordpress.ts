/**
 * Imports public content from the legacy CARISCA WordPress site through its public REST API.
 *
 *   npm run import:wordpress                      # posts, events, legacy pages (images linked remotely)
 *   npm run import:wordpress -- --with-media      # also download images & documents into the media library
 *   npm run import:wordpress -- --source ./wp     # read a saved export (pages.json, posts.json, categories.json,
 *                                                 #  media.json, events.json) instead of fetching live
 *
 * Idempotent: records are matched by slug/path/source URL and are never overwritten once they exist,
 * so edits made in the dashboard survive a re-run. Requires `npm run db:seed` first.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Op } from 'sequelize';
import { env } from '../config/env';
import {
  Article,
  Category,
  CpdProgramme,
  Event,
  HomepageSlide,
  LmiReport,
  MediaAsset,
  Newsletter,
  Page,
  Publication,
  Redirect,
  StaffProfile,
  sequelize,
} from '../models';
import type { ArticleType } from '../models/content';
import { storeUpload } from '../services/media.service';
import { sanitizeRichText, stripHtml } from '../utils/html';
import { slugify } from '../utils/slug';
import { cpdProgrammes, isceaProgrammes, lmiReports, newsletters, publications, slides, staff } from '../seeders/data/curated';
import { legacyPages, pages as curatedPages } from '../seeders/data/pages';
import { SECTION_REDIRECTS, staffSlug } from '../seeders/content';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const BASE = (option('--base') ?? 'https://carisca.knust.edu.gh').replace(/\/$/, '');
const BASE_HOST = new URL(BASE).host;
const SOURCE_DIR = option('--source');
const WITH_MEDIA = flag('--with-media');
const CACHE_DIR = path.join(env.STORAGE_DIR, 'import-cache');

type WpRendered = { rendered: string };
interface WpPost {
  id: number;
  date_gmt: string;
  modified_gmt: string;
  slug: string;
  link: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  featured_media: number;
  categories?: number[];
  parent?: number;
}
interface WpMedia {
  id: number;
  source_url: string;
  alt_text: string;
  caption: WpRendered;
  title: WpRendered;
  mime_type: string;
}
interface WpEvent {
  id: number;
  title: string;
  description: string;
  excerpt: string;
  slug: string;
  url: string;
  all_day: boolean;
  utc_start_date: string;
  utc_end_date: string;
  cost: string;
  website: string;
  image: false | { url: string };
  venue: [] | { venue?: string; address?: string; city?: string };
}

const stats: Record<string, number> = {};
const bump = (k: string, n = 1) => (stats[k] = (stats[k] ?? 0) + n);
const warnings: string[] = [];

// ------------------------------------------------------------------ fetching
async function fetchJson<T>(url: string): Promise<{ data: T; totalPages: number }> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'CARISCA-migration/1.0' }, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return { data: (await res.json()) as T, totalPages: Number(res.headers.get('x-wp-totalpages') ?? 1) };
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function fetchAll<T>(endpoint: string): Promise<T[]> {
  if (SOURCE_DIR) {
    const raw = await fs.readFile(path.join(SOURCE_DIR, `${endpoint}.json`), 'utf8');
    return JSON.parse(raw.replace(/^﻿/, '')) as T[];
  }
  const out: T[] = [];
  for (let page = 1, total = 1; page <= total; page++) {
    const r = await fetchJson<T[]>(`${BASE}/wp-json/wp/v2/${endpoint}?per_page=100&page=${page}`);
    out.push(...r.data);
    total = r.totalPages;
  }
  return out;
}

async function fetchEvents(): Promise<WpEvent[]> {
  if (SOURCE_DIR) {
    const raw = await fs.readFile(path.join(SOURCE_DIR, 'events.json'), 'utf8');
    return JSON.parse(raw.replace(/^﻿/, '')) as WpEvent[];
  }
  const out: WpEvent[] = [];
  for (let page = 1; ; page++) {
    const url = `${BASE}/wp-json/tribe/events/v1/events?per_page=50&page=${page}&start_date=2015-01-01&end_date=2035-12-31`;
    const r = await fetchJson<{ events: WpEvent[]; total_pages: number }>(url);
    out.push(...r.data.events);
    if (page >= r.data.total_pages) break;
  }
  return out;
}

// ------------------------------------------------------------------ text helpers
const decode = (s: string) =>
  s
    .replace(/&#8217;|&#8216;/g, '’')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();

/** Normalises Jetpack CDN URLs (i0.wp.com/…) to the origin upload URL without query string. */
function normaliseUploadUrl(raw: string): string | null {
  try {
    let u = raw.trim();
    if (u.startsWith('//')) u = `https:${u}`;
    const url = new URL(u, BASE);
    if (/^i\d\.wp\.com$/.test(url.host)) {
      const inner = url.pathname.replace(/^\//, '');
      if (!inner.startsWith(`${BASE_HOST}/`)) return null;
      return `https://${inner}`;
    }
    if (url.host !== BASE_HOST || !url.pathname.startsWith('/wp-content/uploads/')) return null;
    return `https://${url.host}${url.pathname}`;
  } catch {
    return null;
  }
}

function cleanExcerpt(html: string) {
  return decode(stripHtml(html).replace(/\[…\]|\[&hellip;\]|Read More.*$/i, '')).replace(/\s*…$/, '…').slice(0, 600) || null;
}

/** Removes WordPress/Elementor leftovers that survive sanitising. */
function cleanBody(html: string) {
  const withoutData = html.replace(/<img[^>]+src="data:[^"]*"[^>]*>/gi, '');
  const sanitised = sanitizeRichText(withoutData) ?? '';
  return sanitised
    .replace(/<p>\s*(&nbsp;| )?\s*<\/p>/g, '')
    .replace(/(<br \/>\s*){3,}/g, '<br /><br />')
    .trim();
}

// ------------------------------------------------------------------ media
const mediaByUrl = new Map<string, MediaAsset>();

async function downloadToMedia(rawUrl: string | null | undefined, meta: { alt?: string | null; caption?: string | null; title?: string | null } = {}) {
  if (!rawUrl) return null;
  const url = normaliseUploadUrl(rawUrl);
  if (!url) return null;
  if (mediaByUrl.has(url)) return mediaByUrl.get(url)!;
  const existing = await MediaAsset.findOne({ where: { source_url: url } });
  if (existing) {
    mediaByUrl.set(url, existing);
    return existing;
  }
  if (!WITH_MEDIA) return null;

  await fs.mkdir(CACHE_DIR, { recursive: true });
  const cacheFile = path.join(CACHE_DIR, crypto.createHash('sha1').update(url).digest('hex'));
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(cacheFile);
  } catch {
    const res = await fetch(url, { headers: { 'user-agent': 'CARISCA-migration/1.0' }, signal: AbortSignal.timeout(120_000) });
    if (!res.ok) {
      warnings.push(`Download failed (${res.status}): ${url}`);
      bump('media_failed');
      return null;
    }
    buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(cacheFile, buffer);
  }
  const originalname = decodeURIComponent(path.posix.basename(new URL(url).pathname));
  try {
    const asset = await storeUpload(
      { originalname, buffer, size: buffer.length, mimetype: '', fieldname: 'file', encoding: '7bit' } as Express.Multer.File,
      { alt_text: meta.alt || null, caption: meta.caption || null, title: meta.title || null, source_url: url },
    );
    mediaByUrl.set(url, asset);
    bump('media_downloaded');
    return asset;
  } catch (err) {
    warnings.push(`Skipped ${url}: ${(err as Error).message}`);
    bump('media_skipped');
    return null;
  }
}

// ------------------------------------------------------------------ classification
const WP_CAT = { announcements: 'announcements', profile: 'profile-stories', project: 'project-news', industryReport: 'industry-report', journals: 'journals' };

function classifyArticle(title: string, wpCatSlugs: string[]): ArticleType {
  if (/newsletter/i.test(title)) return 'newsletter_announcement';
  if (/^call for|call for (applications|papers|entries|submissions|research)|vacancy|admission of candidates/i.test(title)) return 'call';
  if (wpCatSlugs.includes(WP_CAT.announcements)) return 'announcement';
  if (wpCatSlugs.includes(WP_CAT.profile)) return 'story';
  if (wpCatSlugs.includes(WP_CAT.project)) return 'project_update';
  if (wpCatSlugs.includes(WP_CAT.industryReport) || wpCatSlugs.includes(WP_CAT.journals) || /policy brief/i.test(title)) {
    return 'research_highlight';
  }
  return 'news';
}

const TOPIC_RULES: Array<[RegExp, string]> = [
  [/logistics managers index|\blmi\b/i, 'lmi'],
  [/summit|paper development workshop|\bpdw\b|business forum/i, 'summits-and-conferences'],
  [/distinguished lecture/i, 'distinguished-lecture-series'],
  [/dissertation award|scholarship|award/i, 'awards-and-scholarships'],
  [/\bcpd\b|training|workshop|masterclass|professional development|course|programme|program/i, 'training-and-cpd'],
  [/newsletter/i, 'newsletter'],
  [/research|journal|publication|report|policy brief|phd/i, 'research'],
  [/partner|ambassador|foundation|iscea|stakeholder|ministry|association/i, 'partnerships'],
];

function topicCategories(title: string, type: ArticleType, wpCatSlugs: string[]) {
  const slugs = new Set(TOPIC_RULES.filter(([re]) => re.test(title)).map(([, s]) => s));
  if (type === 'story' || wpCatSlugs.includes(WP_CAT.profile)) slugs.add('people');
  return [...slugs];
}

function classifyEvent(title: string): Event['event_type'] {
  if (/summit/i.test(title)) return 'summit';
  if (/call for (papers|applications|entries)/i.test(title)) return 'call_for_papers';
  if (/lecture/i.test(title)) return 'lecture';
  if (/webinar/i.test(title)) return 'webinar';
  if (/forum|exhibition/i.test(title)) return 'forum';
  if (/\bcpd\b|continuing|training series|training|course|analytics/i.test(title)) return 'training';
  if (/workshop|hackathon/i.test(title)) return 'workshop';
  if (/meeting|committee|board|scan|scale/i.test(title)) return 'meeting';
  if (/conference/i.test(title)) return 'conference';
  return 'other';
}

const urlOrNull = (v: string | null | undefined) => {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
};

// ------------------------------------------------------------------ import steps
const linkMap = new Map<string, string>();
const addLink = (oldUrl: string, newPath: string) => {
  try {
    const u = new URL(oldUrl, BASE);
    if (u.host !== BASE_HOST) return;
    linkMap.set(u.pathname.replace(/\/$/, '') || '/', newPath);
  } catch {
    /* ignore */
  }
};

async function ensureRedirect(from: string, to: string, note: string) {
  const from_path = from.replace(/\/$/, '') || '/';
  if (from_path === to) return;
  const [, created] = await Redirect.findOrCreate({ where: { from_path }, defaults: { from_path, to_path: to, status_code: 301, note } });
  if (created) bump('redirects');
}

async function importPosts(posts: WpPost[], media: Map<number, WpMedia>, wpCats: Map<number, string>) {
  const categories = Object.fromEntries((await Category.findAll()).map((c) => [c.slug, c.id]));
  for (const p of posts) {
    addLink(p.link, `/news/${p.slug}`);
    await ensureRedirect(new URL(p.link).pathname, `/news/${p.slug}`, 'Legacy WordPress post');
    const fm = p.featured_media ? media.get(p.featured_media) : undefined;
    const existing = await Article.findOne({ where: { slug: p.slug }, paranoid: false });
    if (existing) {
      // Only fill a missing image; never overwrite edited content.
      if (!existing.featured_image_id && fm) {
        const img = await downloadToMedia(fm.source_url, { alt: fm.alt_text || null });
        if (img) await existing.update({ featured_image_id: img.id });
      }
      bump('articles_existing');
      continue;
    }
    const title = decode(p.title.rendered);
    const catSlugs = (p.categories ?? []).map((id) => wpCats.get(id) ?? '');
    const type = classifyArticle(title, catSlugs);
    const image = fm ? await downloadToMedia(fm.source_url, { alt: fm.alt_text || null, caption: stripHtml(fm.caption.rendered) || null }) : null;
    const article = await Article.create({
      type,
      title,
      slug: p.slug,
      excerpt: cleanExcerpt(p.excerpt.rendered),
      body: cleanBody(p.content.rendered),
      featured_image_id: image?.id ?? null,
      status: 'published',
      published_at: new Date(`${p.date_gmt}Z`),
      legacy_url: p.link,
      review_note: p.featured_media && !fm ? 'The featured image referenced by the legacy post no longer exists.' : null,
    });
    const topicIds = topicCategories(title, type, catSlugs).map((s) => categories[s]).filter(Boolean);
    if (topicIds.length) await article.setCategories(topicIds);
    bump('articles_created');
  }
}

async function importEvents(events: WpEvent[]) {
  for (const e of events) {
    const slug = slugify(decodeURIComponent(e.slug)).slice(0, 180);
    addLink(e.url, `/events/${slug}`);
    await ensureRedirect(new URL(e.url).pathname, `/events/${slug}`, 'Legacy events calendar entry');
    const existing = await Event.findOne({ where: { slug }, paranoid: false });
    if (existing) {
      if (!existing.image_id && e.image) {
        const img = await downloadToMedia(e.image.url);
        if (img) await existing.update({ image_id: img.id });
      }
      bump('events_existing');
      continue;
    }
    const title = decode(e.title || '');
    const venue = Array.isArray(e.venue) ? null : decode([e.venue.venue, e.venue.city].filter(Boolean).join(', ')) || null;
    const image = e.image ? await downloadToMedia(e.image.url) : null;
    const online = /zoom|online|virtual/i.test(`${venue ?? ''} ${title}`) || /^https?:\/\//.test(venue ?? '');
    await Event.create({
      title: title || `Untitled event (${e.id})`,
      slug,
      event_type: classifyEvent(title),
      summary: cleanExcerpt(e.excerpt || e.description),
      body: cleanBody(e.description || ''),
      starts_at: new Date(`${e.utc_start_date.replace(' ', 'T')}Z`),
      ends_at: e.utc_end_date ? new Date(`${e.utc_end_date.replace(' ', 'T')}Z`) : null,
      all_day: e.all_day,
      venue: venue && !/^https?:\/\//.test(venue) ? venue : online ? 'Online' : null,
      location_type: online ? 'online' : 'in_person',
      cost_text: decode(e.cost || '') || null,
      website_url: urlOrNull(e.website),
      image_id: image?.id ?? null,
      status: title ? 'published' : 'draft',
      published_at: new Date(),
      legacy_url: e.url,
      review_note: title ? null : 'This legacy event had no title. Add one or delete the event.',
    });
    bump('events_created');
  }
}

async function importLegacyPages(wpPages: WpPost[]) {
  const byPath = new Map(wpPages.map((p) => [new URL(p.link).pathname.replace(/^\/|\/$/g, ''), p]));
  const ordered = [...legacyPages].sort((a, b) => a.path.split('/').length - b.path.split('/').length);
  for (const lp of ordered) {
    const wp = byPath.get(lp.wpPath);
    if (!wp) {
      warnings.push(`Legacy page not found in export: /${lp.wpPath}/`);
      continue;
    }
    addLink(wp.link, `/${lp.path}`);
    await ensureRedirect(`/${lp.wpPath}`, `/${lp.path}`, 'Legacy WordPress page');
    if (await Page.findOne({ where: { path: lp.path }, paranoid: false })) {
      bump('pages_existing');
      continue;
    }
    const parent = lp.parent ? await Page.findOne({ where: { path: lp.parent } }) : null;
    await Page.create({
      path: lp.path,
      title: lp.title ?? decode(wp.title.rendered),
      body: cleanBody(wp.content.rendered),
      parent_id: parent?.id ?? null,
      status: lp.status,
      published_at: lp.status === 'published' ? new Date() : null,
      legacy_url: wp.link,
      review_note: 'Imported from the legacy WordPress page. Check formatting, images and links before (re)publishing.',
    });
    bump('pages_created');
  }
  return byPath;
}

/** Attaches downloaded files to the curated records created by `npm run db:seed`. */
async function attachCuratedMedia(wpPagesByPath: Map<string, WpPost>) {
  for (const s of staff) {
    const profile = await StaffProfile.findOne({ where: { slug: staffSlug(s.name) } });
    if (!profile) continue;
    if (!profile.photo_id && s.photo_source) {
      const photo = await downloadToMedia(s.photo_source, { alt: `Portrait of ${s.name}` });
      if (photo) await profile.update({ photo_id: photo.id });
    }
    if (!profile.bio && s.legacy_profile) {
      const wp = wpPagesByPath.get(new URL(s.legacy_profile).pathname.replace(/^\/|\/$/g, ''));
      if (wp) {
        // Drop the repeated name/role header and tab labels from the old profile layout.
        let bio = cleanBody(wp.content.rendered)
          .replace(/<img[^>]*>/g, '')
          .replace(/<(p|h\d)>\s*(Profile|Publications)\s*<\/\1>/gi, '');
        const firstPara = bio.indexOf('<p>');
        if (firstPara > 0) bio = bio.slice(firstPara);
        if (stripHtml(bio).length > 80) {
          await profile.update({
            bio,
            review_note: [profile.review_note, 'Biography imported from the legacy profile page (2020–2021). Confirm it is current.']
              .filter(Boolean)
              .join(' '),
          });
          bump('staff_bios');
        }
      }
    }
  }
  for (const p of publications) {
    if (!p.cover_source) continue;
    const pub = await Publication.findOne({ where: { slug: slugify(p.title) } });
    if (pub && !pub.cover_image_id) {
      const cover = await downloadToMedia(p.cover_source, { alt: `Cover of ${p.title}` });
      if (cover) await pub.update({ cover_image_id: cover.id });
    }
  }
  for (const p of publications) {
    if (!p.file_source) continue;
    const pub = await Publication.findOne({ where: { slug: slugify(p.title) } });
    if (pub && !pub.file_id) {
      const file = await downloadToMedia(p.file_source, { title: p.title });
      if (file) await pub.update({ file_id: file.id, ...(pub.external_url === p.file_source ? { external_url: null } : {}) });
      else if (!pub.external_url) {
        // Keep the document reachable via the legacy URL until it is uploaded.
        await pub.update({
          external_url: p.file_source,
          review_note: [pub.review_note, 'File not yet in the media library; currently linked to the legacy website.'].filter(Boolean).join(' '),
        });
      }
    }
  }
  for (const l of lmiReports) {
    const report = await LmiReport.findOne({ where: { year: l.year, quarter: l.quarter } });
    if (report && !report.file_id && l.file_source) {
      const file = await downloadToMedia(l.file_source, { title: `Ghana LMI Report ${l.period_label}` });
      if (file) await report.update({ file_id: file.id });
    }
  }
  for (const n of newsletters) {
    const issue = await Newsletter.findOne({ where: { issue_number: n.issue } });
    if (!issue) continue;
    const updates: Partial<Newsletter> = {};
    if (!issue.cover_image_id) updates.cover_image_id = (await downloadToMedia(n.cover_source, { alt: `Cover of ${n.title}` }))?.id ?? null;
    if (!issue.file_id && n.file_source) {
      updates.file_id = (await downloadToMedia(n.file_source, { title: n.title }))?.id ?? null;
      if (!updates.file_id && !issue.online_url) updates.online_url = n.file_source;
    }
    if (Object.values(updates).some(Boolean)) await issue.update(updates);
  }
  for (const c of cpdProgrammes) {
    const prog = await CpdProgramme.findOne({ where: { slug: c.slug } });
    if (prog && !prog.image_id) {
      const img = await downloadToMedia(c.image_source, { alt: c.title });
      if (img) await prog.update({ image_id: img.id });
    }
  }
  for (const s of slides) {
    const slide = await HomepageSlide.findOne({ where: { title: s.title } });
    if (slide && !slide.image_id) {
      const img = await downloadToMedia(s.image_source, { alt: s.image_alt });
      if (img) await slide.update({ image_id: img.id });
    }
  }
  // ISCEA brochures are linked from the ISCEA page body; downloading registers them for link rewriting.
  for (const prog of isceaProgrammes) await downloadToMedia(prog.brochure, { title: `${prog.name} (${prog.code}) brochure` });
  for (const p of curatedPages) {
    if (!p.hero_source) continue;
    const page = await Page.findOne({ where: { path: p.path } });
    if (page && !page.hero_image_id) {
      const img = await downloadToMedia(p.hero_source, { alt: p.title });
      if (img) await page.update({ hero_image_id: img.id });
    }
  }
}

/** Newsletter "In this issue" lists, cut from the legacy newsletter archive page. */
async function importNewsletterHighlights(wpPagesByPath: Map<string, WpPost>) {
  const wp = wpPagesByPath.get('carisca-newsletters');
  if (!wp) return;
  const html = wp.content.rendered;
  for (const n of newsletters) {
    const issue = await Newsletter.findOne({ where: { issue_number: n.issue } });
    if (!issue || issue.highlights) continue;
    const anchor = n.file_source ?? n.online_url;
    const file = anchor ? path.posix.basename(new URL(anchor).pathname) : null;
    const start = file ? html.indexOf(file) : -1;
    if (start < 0) continue;
    const headingIdx = html.indexOf('IN THIS ISSUE', start);
    const nextImg = html.indexOf('<img', start + 10);
    if (headingIdx < 0 || (nextImg > 0 && headingIdx > nextImg)) continue;
    const listStart = html.indexOf('<ul', headingIdx);
    const segment = html.slice(listStart, nextImg > 0 ? nextImg : undefined);
    const lastUl = segment.lastIndexOf('</ul>');
    if (listStart < 0 || lastUl < 0) continue;
    const highlights = cleanBody(segment.slice(0, lastUl + 5));
    if (highlights) {
      await issue.update({ highlights });
      bump('newsletter_highlights');
    }
  }
}

/** Rewrites links in imported rich text from legacy URLs to their new locations. */
async function rewriteLinks() {
  for (const [from, to] of SECTION_REDIRECTS) if (!linkMap.has(from)) linkMap.set(from, to);
  const rewrite = (html: string | null) => {
    if (!html) return html;
    let changed = html.replace(/(href|src)="([^"]+)"/g, (whole, attr: string, url: string) => {
      const upload = normaliseUploadUrl(url);
      if (upload && mediaByUrl.has(upload)) return `${attr}="${mediaByUrl.get(upload)!.url}"`;
      try {
        const u = new URL(url, BASE);
        if (u.host !== BASE_HOST && !/^i\d\.wp\.com$/.test(u.host)) return whole;
        const key = u.pathname.replace(/\/$/, '') || '/';
        const target = linkMap.get(key);
        return target ? `${attr}="${target}${u.hash}"` : whole;
      } catch {
        return whole;
      }
    });
    changed = changed.replace(/href="http:\/\/localhost\/wordpress[^"]*"/g, 'href="/"');
    return changed;
  };
  for (const model of [Article, Page, Event] as const) {
    const rows = await (model as typeof Article).findAll({ where: { legacy_url: { [Op.ne]: null } }, attributes: ['id', 'body'] });
    for (const row of rows) {
      const next = rewrite(row.body);
      if (next !== row.body) {
        await row.update({ body: next });
        bump('links_rewritten');
      }
    }
  }
}

async function main() {
  console.log(`Importing from ${SOURCE_DIR ? `export at ${SOURCE_DIR}` : BASE}${WITH_MEDIA ? ' (with media download)' : ''}…`);
  await sequelize.authenticate();
  if (!(await Category.count())) throw new Error('Run "npm run db:seed" before importing.');

  const [posts, wpPages, wpCategories, wpMedia, events] = await Promise.all([
    fetchAll<WpPost>('posts'),
    fetchAll<WpPost>('pages'),
    fetchAll<{ id: number; slug: string }>('categories'),
    fetchAll<WpMedia>('media'),
    fetchEvents(),
  ]);
  console.log(`Fetched ${posts.length} posts, ${wpPages.length} pages, ${events.length} events, ${wpMedia.length} media records.`);

  const media = new Map(wpMedia.map((m) => [m.id, m]));
  const wpCats = new Map(wpCategories.map((c) => [c.id, c.slug]));

  const pagesByPath = await importLegacyPages(wpPages);
  await importPosts(posts, media, wpCats);
  await importEvents(events);
  await attachCuratedMedia(pagesByPath);
  await importNewsletterHighlights(pagesByPath);
  await rewriteLinks();


  console.log('Import summary:', stats);
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings.slice(0, 50)) console.log(`  - ${w}`);
    if (warnings.length > 50) console.log(`  … and ${warnings.length - 50} more`);
  }
}

main()
  .then(() => sequelize.close())
  .catch(async (err) => {
    console.error(err);
    await sequelize.close();
    process.exit(1);
  });
