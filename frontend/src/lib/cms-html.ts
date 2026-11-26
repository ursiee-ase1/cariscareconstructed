/**
 * Helpers for laying out CMS rich text in a richer way than one flowing column. They only split
 * the (already sanitised) HTML at its headings; pages fall back to the plain body when the
 * expected headings are missing, so editing a page in the dashboard can never break it.
 */

export interface HtmlSection {
  /** Heading text (tags removed), or null for content before the first heading. */
  heading: string | null;
  /** The content after the heading, up to the next heading of the same level. */
  html: string;
}

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();

/** Splits HTML at each heading of the given level. */
export function splitAtHeadings(html: string | null | undefined, level: 2 | 3): HtmlSection[] {
  const sections: HtmlSection[] = [];
  const re = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)</h${level}>`, 'gi');
  let last = 0;
  let heading: string | null = null;
  for (const m of (html ?? '').matchAll(re)) {
    const content = (html ?? '').slice(last, m.index).trim();
    if (heading !== null || content) sections.push({ heading, html: content });
    heading = textOf(m[1]);
    last = (m.index ?? 0) + m[0].length;
  }
  const rest = (html ?? '').slice(last).trim();
  if (heading !== null || rest) sections.push({ heading, html: rest });
  return sections;
}

/** Finds a section by the start of its heading, case-insensitively. */
export const findSection = (sections: HtmlSection[], startsWith: string) =>
  sections.find((s) => s.heading?.toLowerCase().startsWith(startsWith.toLowerCase()));

/** Joins sections back into HTML (with `<h2>` headings). */
export const joinSections = (sections: HtmlSection[], level: 2 | 3 = 2) =>
  sections.map((s) => (s.heading === null ? s.html : `<h${level}>${s.heading.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h${level}>\n${s.html}`)).join('\n');

/** The first image in some HTML, with its attributes. */
export function firstImage(html: string) {
  const tag = html.match(/<img\b[^>]*>/i)?.[0];
  if (!tag) return null;
  const attr = (name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1] ?? null;
  const src = attr('src');
  if (!src) return null;
  return { src, alt: attr('alt') ?? '', width: Number(attr('width')) || null, height: Number(attr('height')) || null };
}

/**
 * Whether next/image may optimise an image: only files in the media library (under /uploads/, the
 * hosts allowed in next.config.ts). Anything else, e.g. a picture still linked from another site,
 * is shown as is.
 */
export const isLibraryImage = (src: string) => {
  try {
    return new URL(src, 'http://local').pathname.startsWith('/uploads/');
  } catch {
    return false;
  }
};

/** Removes paragraphs that hold nothing but images. */
export const withoutImageParagraphs = (html: string) => html.replace(/<p>\s*(?:<img\b[^>]*>\s*)+<\/p>/gi, '').trim();
