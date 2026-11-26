'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Highlight } from '../ui/Highlight';
import { MIN_QUERY_LENGTH, searchTypeLabel } from '@/lib/search';

/** Wait this long after the last keystroke before searching. */
const DEBOUNCE_MS = 220;

interface PreviewResult {
  type: string;
  title: string;
  url: string;
  snippet: string;
}
interface PreviewState {
  term: string;
  status: 'ready' | 'error';
  results: PreviewResult[];
  total: number;
}

/**
 * Top results for what has been typed so far (debounced; earlier requests are cancelled). While a
 * new search runs, the previous results stay on screen, marked as loading.
 */
function useSearchPreview(query: string) {
  const term = query.trim();
  const [state, setState] = useState<PreviewState | null>(null);

  useEffect(() => {
    if (term.length < MIN_QUERY_LENGTH) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-preview?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { results: PreviewResult[]; total: number };
        setState({ term, status: 'ready', results: body.results, total: body.total });
      } catch {
        if (!ctrl.signal.aborted) setState({ term, status: 'error', results: [], total: 0 });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  if (term.length < MIN_QUERY_LENGTH) return null;
  return { term, loading: state?.term !== term, status: state?.status ?? 'ready', results: state?.results ?? [], total: state?.total ?? 0 };
}

/** Search field with a live list of matching pages (WAI-ARIA combobox with a listbox popup). */
function SearchBox({
  id,
  q,
  setQ,
  variant,
  inputRef,
}: {
  id: string;
  q: string;
  setQ: (v: string) => void;
  variant: 'desktop' | 'mobile';
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const preview = useSearchPreview(q);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;

  // Close once the visitor has moved to another page.
  const pathname = usePathname();
  const [shownOn, setShownOn] = useState(pathname);
  if (pathname !== shownOn) {
    setShownOn(pathname);
    setOpen(false);
    setActive(-1);
  }

  const results = preview?.results ?? [];
  const optionCount = preview ? results.length + 1 : 0; // + "See all results"
  const activeIndex = active < optionCount ? active : -1;
  const expanded = open && Boolean(preview);
  const allHref = preview ? `/search?q=${encodeURIComponent(preview.term)}` : '/search';

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && preview) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, optionCount - 1));
    } else if (e.key === 'ArrowUp' && expanded) {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && expanded && activeIndex >= 0) {
      e.preventDefault();
      document.getElementById(optionId(activeIndex))?.click();
    } else if (e.key === 'Escape' && expanded) {
      // First Escape closes the preview; the browser's own Escape (clearing the field) comes second.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  const desktop = variant === 'desktop';
  const status = !preview
    ? ''
    : preview.status === 'error' && !preview.loading
      ? 'Search is unavailable right now.'
      : preview.loading
        ? 'Searching…'
        : preview.total
          ? `${preview.total} result${preview.total === 1 ? '' : 's'}`
          : `No matches for “${preview.term}”`;

  return (
    <div className={desktop ? 'relative' : 'flex-1'} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOpen(false)}>
      <input
        ref={inputRef}
        id={id}
        name="q"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={desktop ? 'Search news, research, events…' : 'Search the website'}
        minLength={MIN_QUERY_LENGTH}
        className={
          desktop
            ? 'h-full w-60 bg-transparent pl-4 text-sm text-ink outline-none placeholder:text-muted lg:w-72'
            : 'h-11 w-full rounded-full border border-line px-4 text-base outline-none focus:border-brand-500'
        }
      />
      <p className="sr-only" aria-live="polite">
        {expanded ? status : ''}
      </p>
      {expanded && preview && (
        <div
          className={
            desktop
              ? 'absolute top-full right-0 z-50 mt-3 w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-(--radius-card) border border-line bg-white shadow-(--shadow-raised)'
              : 'absolute inset-x-0 top-full z-50 overflow-hidden border-y border-line bg-white shadow-(--shadow-raised)'
          }
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase">
            <span>{preview.loading && !results.length ? 'Searching…' : status}</span>
            {preview.loading && <Loader2 aria-hidden className="size-3.5 animate-spin text-brand-600" />}
          </div>
          <ul id={listId} role="listbox" aria-label="Search suggestions" className={`max-h-[min(28rem,60vh)] overflow-y-auto ${preview.loading && results.length ? 'opacity-60' : ''}`}>
            {results.map((r, i) => (
              <li key={`${r.type}-${r.url}`} role="presentation">
                <Link
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === activeIndex}
                  href={r.url}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-line/70 px-4 py-3 ${i === activeIndex ? 'bg-brand-50' : ''}`}
                >
                  <span className="text-[0.7rem] font-semibold tracking-wide text-sky-ink uppercase">{searchTypeLabel(r.type)}</span>
                  <span className="mt-0.5 block font-semibold text-ink">
                    <Highlight text={r.title} query={preview.term} />
                  </span>
                  {r.snippet && (
                    <span className="mt-0.5 line-clamp-2 text-sm text-muted">
                      <Highlight text={r.snippet} query={preview.term} />
                    </span>
                  )}
                </Link>
              </li>
            ))}
            <li role="presentation">
              <Link
                id={optionId(results.length)}
                role="option"
                aria-selected={activeIndex === results.length}
                href={allHref}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(results.length)}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 font-display text-sm font-semibold text-brand-700 ${activeIndex === results.length ? 'bg-brand-50' : ''}`}
              >
                {preview.total > results.length ? `See all ${preview.total} results` : 'Open the search page'} for “{preview.term}”
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Site search: inline field on desktop, expanding panel on small screens. Shows matching pages
 * as the visitor types; submitting opens the full results on /search.
 */
export function HeaderSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term.length < MIN_QUERY_LENGTH) return;
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <>
      <form role="search" onSubmit={submit} action="/search" className="hidden md:block">
        <label htmlFor={`${id}-desk`} className="sr-only">
          Search the CARISCA website
        </label>
        <div className="flex h-10 items-center rounded-full border border-line bg-surface focus-within:border-brand-500 focus-within:bg-white">
          <SearchBox id={`${id}-desk`} q={q} setQ={setQ} variant="desktop" />
          <button type="submit" className="flex h-full w-11 items-center justify-center rounded-r-full text-brand-700 hover:text-brand-900" aria-label="Search">
            <Search aria-hidden className="size-4" />
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center rounded-(--radius-control) text-brand-800 hover:bg-brand-50 md:hidden"
        aria-expanded={open}
        aria-controls={`${id}-mobile`}
        aria-label={open ? 'Close search' : 'Open search'}
      >
        {open ? <X aria-hidden className="size-5" /> : <Search aria-hidden className="size-5" />}
      </button>
      {open && (
        <form
          id={`${id}-mobile`}
          role="search"
          onSubmit={submit}
          action="/search"
          className="absolute inset-x-0 top-full z-50 border-b border-line bg-white p-4 shadow-(--shadow-raised) md:hidden"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <label htmlFor={`${id}-mob`} className="sr-only">
            Search the CARISCA website
          </label>
          <div className="flex gap-2">
            <SearchBox id={`${id}-mob`} q={q} setQ={setQ} variant="mobile" inputRef={inputRef} />
            <button type="submit" className="h-11 rounded-full bg-brand-700 px-5 font-display font-semibold text-white">
              Search
            </button>
          </div>
        </form>
      )}
    </>
  );
}

/** The header search, pre-filled with the current query on the search results page. */
export function HeaderSearchFromUrl() {
  const pathname = usePathname();
  const params = useSearchParams();
  const q = pathname === '/search' ? (params.get('q') ?? '') : '';
  return <HeaderSearch key={q} initialQuery={q} />;
}
