import type { MenuNode, SiteData } from '@/types/api';

/**
 * Pages that are temporarily hidden from public navigation. They stay published and reachable at
 * their URL, and their menu items, content and assets are untouched in the dashboard; the site
 * simply leaves them out of the header and footer menus, "In this section" lists and the sitemap.
 * To show a page again, remove its path from this list.
 */
export const HIDDEN_FROM_NAVIGATION: readonly string[] = [
  // Distinguished Lecture Series: hidden on request (November 2026) until it is reactivated.
  '/research/distinguished-lecture-series',
];

const normalise = (href: string) => `/${href.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '')}`.toLowerCase();

/** True when an internal link points at a hidden page (or one of its sub-pages). */
export function isHiddenPath(href: string | null | undefined) {
  if (!href || /^[a-z]+:/i.test(href)) return false;
  const path = normalise(href);
  return HIDDEN_FROM_NAVIGATION.some((hidden) => path === hidden || path.startsWith(`${hidden}/`));
}

function visibleNodes(nodes: MenuNode[]): MenuNode[] {
  return nodes.filter((n) => !isHiddenPath(n.href)).map((n) => ({ ...n, children: visibleNodes(n.children ?? []) }));
}

/** Site data with hidden pages removed from every menu. */
export function withVisibleMenus(site: SiteData): SiteData {
  const menus = Object.fromEntries(Object.entries(site.menus ?? {}).map(([key, nodes]) => [key, visibleNodes(nodes ?? [])]));
  return { ...site, menus };
}
