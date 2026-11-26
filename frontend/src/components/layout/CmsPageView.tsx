import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Page } from '@/types/api';
import { firstImage, isLibraryImage } from '@/lib/cms-html';
import { sectionLinks, sectionRootOf, type SectionLink } from '@/lib/sections';
import { getPublications, resolvePage } from '@/services/public';
import { RichText } from '../ui/Typography';
import { PageHeader, type Crumb } from './PageHeader';

export function crumbsFor(page: Page): Crumb[] {
  const crumbs: Crumb[] = [];
  if (page.parent) crumbs.push({ label: page.parent.title, href: `/${page.parent.path}` });
  crumbs.push({ label: page.title });
  return crumbs;
}

/** The section a page belongs to: its parent, or the page itself when it has sub-pages. */
export function sectionOf(page: Pick<Page, 'title' | 'path' | 'parent'>, siblings: Array<{ title: string; path: string }>) {
  const root = page.parent ? { title: page.parent.title, path: page.parent.path } : siblings.length ? { title: page.title, path: page.path } : null;
  return root ? { root, links: sectionLinks(root.path, siblings) } : null;
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&#39;': '’', '&rsquo;': '’', '&lsquo;': '‘', '&ndash;': '–', '&mdash;': '—' };

/** The first real paragraph of a page's body as plain text, for pages without a summary. */
function excerpt(html: string | null | undefined, max = 170) {
  for (const [, inner] of (html ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const text = inner
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length < 60) continue;
    if (text.length <= max) return text;
    return `${text.slice(0, text.lastIndexOf(' ', max))}…`;
  }
  return null;
}

/** The image for a page's card: its title-band photo, its sharing image, or the first media-library picture in its text. */
function cardImage(page: Page | null) {
  if (!page) return null;
  const media = page.heroImage ?? page.ogImage;
  if (media?.url) return { url: media.url, width: media.width, height: media.height };
  // Pictures linked from other sites are skipped: they may no longer exist.
  const found = firstImage(page.body ?? '');
  return found && isLibraryImage(found.src) ? { url: found.src, width: found.width, height: found.height } : null;
}

const pageOf = (r: Awaited<ReturnType<typeof resolvePage>> | null) => (r?.type === 'page' ? r.page : null);

/**
 * The section of a page that is not one of the CMS section's own child pages (the CPD page,
 * publications, /lmi, /asn-ra), for the section cards at its foot. Null if it belongs to none.
 */
export async function sectionForPath(path: string) {
  const root = sectionRootOf(path);
  const r = root ? await resolvePage(`/${root}`).catch(() => null) : null;
  return r?.type === 'page' ? sectionOf(r.page, r.siblings) : null;
}

/** "More in {section}" cards for a page built in code (see `sectionForPath`). */
export async function MoreInSection({ path }: { path: string }) {
  const section = await sectionForPath(path);
  if (!section) return null;
  return (
    <div className="container-site py-14">
      <SectionCards section={section} current={path} />
    </div>
  );
}

/**
 * The pages of a section as cards with a photo, summary and link: all of them on the section's
 * landing page, and the others at the foot of each page in the section.
 */
export async function SectionCards({ section, current }: { section: { root: { title: string; path: string }; links: SectionLink[] }; current: string }) {
  const onLanding = current === section.root.path;
  const links = section.links.filter((l) => l.path !== current);
  if (!links.length) return null;
  const [pages, imagePages, latestPublication] = await Promise.all([
    Promise.all(links.map((l) => (l.summary ? null : resolvePage(`/${l.path}`).catch(() => null)))),
    Promise.all(links.map((l) => (l.imageFromPage ? resolvePage(`/${l.imageFromPage}`).catch(() => null) : null))),
    links.some((l) => l.imageFrom === 'latest-publication')
      ? getPublications({ pageSize: 1 })
          .then((r) => r.data[0]?.coverImage ?? null)
          .catch(() => null)
      : null,
  ]);
  return (
    <section aria-labelledby="section-pages-heading" className={onLanding ? 'mt-14' : 'border-t border-line pt-12'}>
      <h2 id="section-pages-heading" className="text-[1.75rem] font-bold">
        {onLanding ? (
          'In this section'
        ) : (
          <>
            More in{' '}
            <Link href={`/${section.root.path}`} className="text-brand-700 hover:underline">
              {section.root.title}
            </Link>
          </>
        )}
      </h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link, i) => {
          const page = pageOf(pages[i]);
          const summary = link.summary ?? page?.summary ?? excerpt(page?.body);
          const image =
            cardImage(page) ??
            (link.imageFromPage ? cardImage(pageOf(imagePages[i])) : null) ??
            (link.imageFrom === 'latest-publication' && latestPublication?.url ? latestPublication : null);
          // A very wide image (a logo or banner) or a tall one (a report cover) is shown whole
          // rather than as a cropped middle.
          const ratio = image?.width && image.height ? image.width / image.height : 1.33;
          const banner = ratio > 2.5 || ratio < 0.85;
          return (
            <li key={link.path} className="group relative flex flex-col overflow-hidden rounded-(--radius-card) border border-line bg-white shadow-(--shadow-card)">
              {image ? (
                <div className={`relative aspect-4/3 ${ratio < 0.85 ? 'bg-surface' : banner ? 'bg-white' : 'bg-surface'}`}>
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    unoptimized={!isLibraryImage(image.url)}
                    sizes="(min-width:1024px) 24rem, (min-width:640px) 50vw, 100vw"
                    className={ratio < 0.85 ? 'object-contain py-4 drop-shadow-md' : banner ? 'object-contain p-4' : 'object-cover'}
                  />
                </div>
              ) : (
                <div aria-hidden className="flex aspect-4/3 items-center justify-center bg-linear-to-br from-brand-800 to-brand-950">
                  <BookOpen className="size-10 text-sky-accent/80" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold">
                  <Link href={`/${link.path}`} className="after:absolute after:inset-0 group-hover:text-brand-700">
                    {page?.title ?? link.title}
                  </Link>
                </h3>
                {summary && <p className="mt-2 line-clamp-3 text-[0.95rem] text-muted">{summary}</p>}
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 font-display text-sm font-semibold text-brand-700" aria-hidden>
                  Explore <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Standard CMS page template: title band and rich text body, followed by cards for the pages of
 * its section (all of them on the section's landing page, the others on each page in it).
 * `before` renders above the body and `children` below it (forms, listings, etc.); `aside` adds a
 * sidebar.
 */
export function CmsPageView({
  page,
  siblings = [],
  children,
  before,
  aside,
  header,
}: {
  page: Page;
  siblings?: Array<{ id: number; title: string; path: string }>;
  children?: ReactNode;
  /** Rendered above the body (e.g. a notice that belongs at the top of the content). */
  before?: ReactNode;
  aside?: ReactNode;
  /** Replaces the default title band (e.g. to leave out a logo that does not work as a backdrop). */
  header?: ReactNode;
}) {
  const section = sectionOf(page, siblings);
  return (
    <>
      {header ?? <PageHeader title={page.title} intro={page.summary} crumbs={crumbsFor(page)} image={page.heroImage} />}
      <div className={`container-site py-12 md:py-16 ${aside ? 'grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]' : ''}`}>
        <div className={aside ? 'min-w-0' : 'mx-auto max-w-4xl'}>
          {before}
          <RichText html={page.body} />
          {children}
        </div>
        {aside && <aside className="space-y-8 lg:pt-1">{aside}</aside>}
      </div>
      {section && (
        <div className="container-site pb-16">
          <SectionCards section={section} current={page.path} />
        </div>
      )}
    </>
  );
}
