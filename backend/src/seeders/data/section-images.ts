/**
 * Images for section pages that have none of their own. They come from each page's original
 * content on the legacy site (or, where that file has since been deleted, the Internet Archive's
 * copy of the same file), or from the media library. Applied by scripts/update-content-2026-11.ts,
 * only to pages that have no image set.
 *
 * `hero` is the photo in the page's title band (also used on its "In this section" card);
 * `share` is the social-sharing image, used for logos that would not work behind a title.
 */
export interface ImageSource {
  /** A file on the legacy WordPress site. */
  legacy?: string;
  /** The Internet Archive's copy of a legacy file that has since been deleted. */
  archived?: string;
  /** A file already in the media library (its stored file name). */
  existingFile?: string;
  alt: string;
}

export interface SectionPageImage {
  path: string;
  hero?: ImageSource;
  share?: ImageSource;
  /** Remove (or, when an archived copy exists, replace) images in the body whose files are gone. */
  repairBodyImages?: boolean;
}

const WP = 'https://carisca.knust.edu.gh/wp-content/uploads';
const ARCHIVE = 'https://web.archive.org/web/2021id_/https://carisca.knust.edu.gh/wp-content/uploads';

export const sectionPageImages: SectionPageImage[] = [
  {
    path: 'research/dissertation-awards',
    hero: { legacy: `${WP}/2024/10/0X3A2503-scaled.jpg`, alt: 'A presenter speaking at CARISCA’s 2024 Supply Chain Research Summit' },
  },
  {
    path: 'research/research-capacity-development',
    hero: { archived: `${ARCHIVE}/2020/08/dual.jpg`, alt: 'A researcher in a laboratory, and two men reviewing data in a cocoa farm' },
    repairBodyImages: true,
  },
  {
    path: 'research/innovations-lab',
    share: { legacy: `${WP}/2022/06/Carisca_Innovations__5_-removebg-preview-1.png`, alt: 'CARISCA Innovations logo' },
  },
  {
    path: 'stakeholder-engagement/industry-engagement',
    hero: { existingFile: '0b7a9607-scaled-315139b7.jpg', alt: 'Delegates following a session at a CARISCA event' },
    repairBodyImages: true,
  },
  {
    path: 'stakeholder-engagement/supply-chain-action-network',
    hero: { archived: `${ARCHIVE}/2020/08/action-lab-1.jpg`, alt: 'A team working together around a table' },
    repairBodyImages: true,
  },
];

/** The legacy-site address of an image referenced in page content (CDN copies included). */
export function legacyOriginal(src: string) {
  const url = src.replace(/&amp;/g, '&');
  const m = url.match(/^https?:\/\/(?:i\d\.wp\.com\/)?(carisca\.knust\.edu\.gh\/wp-content\/uploads\/[^?#]+)/i);
  return m ? `https://${m[1]}` : null;
}
