import { isHiddenPath } from './visibility';

export interface SectionLink {
  title: string;
  path: string;
  /** Shown on the section cards; CMS pages use their own summary instead. */
  summary?: string;
  /** For a code-built page: use the title-band image of this CMS page on its card. */
  imageFromPage?: string;
  /** For a code-built listing: a picture taken from its content. */
  imageFrom?: 'latest-publication';
}

/**
 * Pages that belong to a CMS section but are not its CMS child pages: pages built in code, or
 * CMS pages that live at the top level (e.g. /lmi). Each is inserted after the page named in
 * `after`, at the start (`after: 'start'`), or at the end.
 */
const EXTRA_PAGES: Record<string, Array<SectionLink & { after?: string }>> = {
  training: [
    {
      title: 'CARISCA CPDs',
      path: 'training/cpd',
      after: 'training/academic-programmes',
      summary: 'Continuing professional development and executive education for supply chain, procurement and logistics professionals.',
      // The Training page's photo is of a CARISCA CPD session.
      imageFromPage: 'training',
    },
  ],
  research: [
    { title: 'Publications & Resources', path: 'publications', after: 'start', summary: 'Industry reports, policy briefs and journal articles.', imageFrom: 'latest-publication' },
    // CMS pages at the top level: their cards use their own summary and title-band image.
    { title: 'Logistics Managers Index', path: 'lmi', after: 'publications' },
    { title: 'ASN-RA', path: 'asn-ra', after: 'lmi' },
  ],
};

/**
 * The pages of a section, in order, for the section cards: the CMS child pages of `rootPath`
 * plus any extra pages, without pages hidden from navigation.
 */
export function sectionLinks(rootPath: string, cmsChildren: Array<{ title: string; path: string }>): SectionLink[] {
  const links: SectionLink[] = cmsChildren.filter((c) => !isHiddenPath(c.path)).map(({ title, path }) => ({ title, path }));
  for (const { after, ...link } of EXTRA_PAGES[rootPath] ?? []) {
    if (links.some((l) => l.path === link.path)) continue;
    const at = after === 'start' ? 0 : after ? links.findIndex((l) => l.path === after) + 1 : 0;
    links.splice(at > 0 || after === 'start' ? at : links.length, 0, link);
  }
  return links;
}

/** The section that a page outside the CMS page tree belongs to (e.g. /lmi → Research). */
export function sectionRootOf(path: string) {
  return Object.keys(EXTRA_PAGES).find((root) => EXTRA_PAGES[root].some((l) => l.path === path)) ?? null;
}
