import { connection } from 'next/server';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { jsonLd, organizationJsonLd } from '@/lib/seo';
import { getSite } from '@/services/public';
import { withVisibleMenus } from '@/lib/visibility';
import type { SiteData } from '@/types/api';

const FALLBACK_SITE: SiteData = {
  settings: {
    site_name: 'CARISCA',
    site_full_name: 'Centre for Applied Research and Innovation in Supply Chain – Africa',
  },
  menus: { main: [{ id: 1, label: 'Home', href: '/', description: null, open_in_new_tab: false, external: false, children: [] }] },
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Render on request (content is cached per API call and purged on publish), so builds never
  // depend on the API being reachable.
  await connection();
  let site: SiteData;
  try {
    site = withVisibleMenus(await getSite());
  } catch {
    // Keep the shell usable if the API is briefly unreachable; pages show their own error state.
    site = FALLBACK_SITE;
  }
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded bg-white px-4 py-2 font-semibold text-brand-800 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <SiteHeader site={site} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter site={site} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organizationJsonLd(site.settings))} />
    </>
  );
}
