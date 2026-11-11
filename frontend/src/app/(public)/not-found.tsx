import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="container-site py-24 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-3 text-3xl font-bold md:text-4xl">Page not found</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
        The page you are looking for may have moved as part of the new CARISCA website. Try searching, or start from one of these sections.
      </p>
      <form action="/search" role="search" className="mx-auto mt-8 flex max-w-md gap-2">
        <label htmlFor="nf-search" className="sr-only">
          Search the website
        </label>
        <input id="nf-search" name="q" type="search" placeholder="Search the website" className="h-11 flex-1 rounded-(--radius-control) border border-line px-3" />
        <button type="submit" className={buttonClass()}>
          Search
        </button>
      </form>
      <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 font-display font-semibold">
        {[
          ['/', 'Home'],
          ['/about', 'About'],
          ['/research', 'Research'],
          ['/publications', 'Publications'],
          ['/news', 'News'],
          ['/events', 'Events'],
          ['/contact', 'Contact'],
        ].map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="link">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
