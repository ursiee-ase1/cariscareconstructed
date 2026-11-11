'use client';

import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

/** Site search: inline field on desktop, expanding field on small screens. Submits to /search. */
export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <>
      <form role="search" onSubmit={submit} action="/search" className="hidden md:block">
        <label htmlFor={`${id}-desk`} className="sr-only">
          Search the CARISCA website
        </label>
        <div className="flex h-10 items-center rounded-(--radius-control) border border-line bg-surface focus-within:border-brand-500 focus-within:bg-white">
          <input
            id={`${id}-desk`}
            name="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search news, research, events…"
            minLength={2}
            className="h-full w-60 bg-transparent pl-3 text-sm text-ink outline-none placeholder:text-muted lg:w-72"
          />
          <button type="submit" className="flex h-full w-10 items-center justify-center text-brand-700 hover:text-brand-900" aria-label="Search">
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
            <input
              ref={inputRef}
              id={`${id}-mob`}
              name="q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the website"
              className="h-11 flex-1 rounded-(--radius-control) border border-line px-3 text-base outline-none focus:border-brand-500"
            />
            <button type="submit" className="h-11 rounded-(--radius-control) bg-brand-700 px-4 font-display font-semibold text-white">
              Search
            </button>
          </div>
        </form>
      )}
    </>
  );
}
