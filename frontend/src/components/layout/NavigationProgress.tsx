'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/** How often the bar creeps forward while a page loads, and how long the finished bar lingers. */
const TICK_MS = 200;
const DONE_MS = 350;
/** A load that is still running after this long is abandoned, so the bar never sticks. */
const GIVE_UP_MS = 30_000;

type Phase = 'idle' | 'loading' | 'done';

/** The address a click or search would load, or null when it stays on this page or leaves the site. */
function internalTarget(url: URL) {
  if (url.origin !== window.location.origin) return null;
  const here = `${window.location.pathname}${window.location.search}`;
  const there = `${url.pathname}${url.search}`;
  return there === here ? null : there;
}

/**
 * Thin loading bar shown while the next page is fetched. It runs along the bottom edge of the
 * site header (under the main navigation) or, when the header has been scrolled away, along the
 * top of the screen.
 *
 * The App Router has no global "navigation started" event, so loading starts on clicks on
 * internal links and GET form submissions (site search), and finishes when the new address has
 * rendered. Back/forward is restored from the router cache almost instantly, so it has no bar.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [top, setTop] = useState(0);
  const giveUp = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    const header = document.querySelector('body header');
    setTop(Math.max(0, header?.getBoundingClientRect().bottom ?? 0));
    setProgress(8);
    setPhase('loading');
    if (giveUp.current) clearTimeout(giveUp.current);
    giveUp.current = setTimeout(() => setPhase('idle'), GIVE_UP_MS);
  }, []);

  // Start: internal link clicks and site search.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || !a.href || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
      if (internalTarget(new URL(a.href))) start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if ((form.method || 'get').toLowerCase() !== 'get') return;
      // Search forms validate before navigating; only start once there is something to search for.
      queueMicrotask(() => {
        const url = new URL(form.action, window.location.href);
        new FormData(form).forEach((v, k) => typeof v === 'string' && v.trim() && url.searchParams.set(k, v.trim()));
        if (url.search && internalTarget(url)) start();
      });
    };
    // Capture phase: next/link cancels the click's default action before it reaches the document.
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [start]);

  // Creep towards 90% while loading, more slowly the further it gets.
  useEffect(() => {
    if (phase !== 'loading') return;
    const t = setInterval(() => setProgress((p) => p + (90 - p) * 0.08), TICK_MS);
    return () => clearInterval(t);
  }, [phase]);

  // Finish when the new page has rendered (its address is now the current one).
  const route = `${pathname}?${searchParams.toString()}`;
  const [renderedRoute, setRenderedRoute] = useState(route);
  if (route !== renderedRoute) {
    setRenderedRoute(route);
    if (phase === 'loading') {
      setPhase('done');
      setProgress(100);
    }
  }

  useEffect(() => {
    if (phase !== 'done') return;
    if (giveUp.current) clearTimeout(giveUp.current);
    const t = setTimeout(() => {
      setPhase('idle');
      setProgress(0);
    }, DONE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'idle') return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className="pointer-events-none fixed inset-x-0 z-50 h-0.75"
      style={{ top }}
    >
      <div
        className={`h-full bg-gold shadow-[0_0_8px_rgb(211_181_116/0.7)] transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none ${phase === 'done' ? 'opacity-0 delay-150' : 'opacity-100'}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
