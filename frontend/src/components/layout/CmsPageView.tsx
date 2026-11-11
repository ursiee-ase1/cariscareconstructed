import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Page } from '@/types/api';
import { isHiddenPath } from '@/lib/visibility';
import { RichText } from '../ui/Typography';
import { PageHeader, type Crumb } from './PageHeader';

export function crumbsFor(page: Page): Crumb[] {
  const crumbs: Crumb[] = [];
  if (page.parent) crumbs.push({ label: page.parent.title, href: `/${page.parent.path}` });
  crumbs.push({ label: page.title });
  return crumbs;
}

/**
 * Standard CMS page template: title band, rich text body and an "In this section" sidebar of
 * sibling pages. `before` renders above the body and `children` below it (forms, listings, etc.).
 */
export function CmsPageView({
  page,
  siblings = [],
  children,
  before,
  aside,
}: {
  page: Page;
  siblings?: Array<{ id: number; title: string; path: string }>;
  children?: ReactNode;
  /** Rendered above the body (e.g. a notice that belongs at the top of the content). */
  before?: ReactNode;
  aside?: ReactNode;
}) {
  const sectionLinks = siblings.filter((s) => s.id !== page.id && !isHiddenPath(s.path));
  const showSidebar = page.template !== 'wide' && (sectionLinks.length > 0 || aside);
  return (
    <>
      <PageHeader title={page.title} intro={page.summary} crumbs={crumbsFor(page)} image={page.heroImage} />
      <div className={`container-site py-12 md:py-16 ${showSidebar ? 'grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]' : ''}`}>
        <div className={showSidebar ? '' : 'mx-auto max-w-4xl'}>
          {before}
          <RichText html={page.body} />
          {children}
        </div>
        {showSidebar && (
          <aside className="space-y-8 lg:pt-1">
            {sectionLinks.length > 0 && (
              <nav aria-label="In this section" className="rounded-(--radius-card) border border-line bg-surface p-5">
                <h2 className="font-display text-sm font-bold tracking-[0.12em] text-muted uppercase">In this section</h2>
                <ul className="mt-3 space-y-1">
                  {page.parent && (
                    <li>
                      <Link href={`/${page.parent.path}`} className="block rounded px-2 py-1.5 font-semibold text-brand-800 hover:bg-white">
                        {page.parent.title}
                      </Link>
                    </li>
                  )}
                  {sectionLinks.map((s) => (
                    <li key={s.id}>
                      <Link href={`/${s.path}`} className="block rounded px-2 py-1.5 text-body hover:bg-white hover:text-brand-700">
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            {aside}
          </aside>
        )}
      </div>
    </>
  );
}
