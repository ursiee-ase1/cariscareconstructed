import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import type { SiteData } from '@/types/api';
import { SmartLink } from '../ui/SmartLink';
import { MainNav } from './MainNav';
import { HeaderSearch } from './HeaderSearch';

/** Institutional header: KNUST affiliation strip, CARISCA identity, search and main navigation. */
export function SiteHeader({ site }: { site: SiteData }) {
  const s = site.settings;
  const main = site.menus.main ?? [];
  const utility = site.menus.utility ?? [];
  return (
    <header className="relative z-40">
      {/* Affiliation / utility strip */}
      <div className="border-b-2 border-knust-maroon bg-brand-950 text-[0.8125rem] text-brand-100">
        <div className="container-site flex h-10 items-center justify-between gap-4">
          <a href="https://www.knust.edu.gh/" target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2.5 hover:text-white">
            <Image src="/brand/knust-logo-white.png" alt="KNUST" width={127} height={25} className="h-5 w-auto shrink-0" />
            <span className="hidden truncate sm:inline">{s.affiliation_text ?? 'Kwame Nkrumah University of Science and Technology'}</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <div className="flex items-center gap-5">
            {s.contact_phone && (
              <a href={`tel:${s.contact_phone_link ?? s.contact_phone}`} className="hidden items-center gap-1.5 whitespace-nowrap hover:text-white md:flex">
                <Phone aria-hidden className="size-3.5" />
                {s.contact_phone}
              </a>
            )}
            {s.contact_email && (
              <a href={`mailto:${s.contact_email}`} className="hidden items-center gap-1.5 hover:text-white lg:flex">
                <Mail aria-hidden className="size-3.5" />
                {s.contact_email}
              </a>
            )}
            {utility.length > 0 && (
              <nav aria-label="Quick links" className="hidden md:block">
                <ul className="flex items-center gap-4">
                  {utility.map((item) => (
                    <li key={item.id}>
                      <SmartLink href={item.href} newTab={item.open_in_new_tab} className="hover:text-white">
                        {item.label}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </div>
      </div>

      {/* Identity bar */}
      <div className="bg-white">
        <div className="container-site flex h-18 items-center justify-between gap-6 lg:h-24">
          <Link href="/" className="flex min-w-0 items-center" aria-label={`${s.site_name ?? 'CARISCA'} home`}>
            <Image
              src="/brand/carisca-lockup-120.jpg"
              alt={`${s.site_name ?? 'CARISCA'} – ${s.site_full_name ?? 'Centre for Applied Research and Innovation in Supply Chain – Africa'}`}
              width={1617}
              height={120}
              preload
              className="hidden h-11 w-auto xl:block"
            />
            <Image
              src="/brand/carisca-wordmark-navy.png"
              alt={s.site_name ?? 'CARISCA'}
              width={601}
              height={101}
              preload
              className="h-8 w-auto xl:hidden"
            />
            <span className="ml-3 hidden max-w-56 border-l border-line pl-3 font-display text-[0.8rem] leading-tight font-semibold text-brand-900 sm:block xl:hidden">
              {s.site_full_name}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <HeaderSearch />
            {s.summit_url && (
              <a
                href={s.summit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden h-10 items-center rounded-(--radius-control) bg-gold px-4 font-display text-sm font-bold tracking-wide text-brand-950 hover:bg-[#c9a85c] lg:inline-flex"
              >
                {s.summit_label ?? 'Summit'}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <MainNav items={main} utility={utility} contact={{ phone: s.contact_phone, phoneLink: s.contact_phone_link, email: s.contact_email }} />
    </header>
  );
}
