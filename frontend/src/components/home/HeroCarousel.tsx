'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import type { Slide } from '@/types/api';
import { ButtonLink } from '../ui/Button';
import { CmsImage } from '../ui/CmsImage';

const INTERVAL_MS = 5000;
const SLIDE_MS = 950;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SWIPE_PX = 40;
const REDUCED = '(prefers-reduced-motion: reduce)';
/** Height of the site header (utility strip, identity bar and main navigation) from the lg breakpoint. */
const HEADER_HEIGHT = '190px';
const subscribeReducedMotion = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/**
 * Homepage hero banner (WAI-ARIA carousel pattern). Slides travel right to left; the track is
 * bookended with copies of the last and first slides so wrapping keeps the same direction, then
 * jumps (invisibly) back to the real slide. Auto-rotation pauses on hover/focus and is off when
 * reduced motion is preferred, which also removes the sliding.
 */
export function HeroCarousel({ slides, fallbackTitle, fallbackCaption }: { slides: Slide[]; fallbackTitle: string; fallbackCaption?: string | null }) {
  const items: Slide[] = slides.length
    ? slides
    : [{ id: 0, title: fallbackTitle, caption: fallbackCaption ?? null, image: null, image_alt: null, button_label: 'About CARISCA', button_url: '/about', secondary_label: null, secondary_url: null }];
  const n = items.length;
  const looped = n > 1;
  const track = looped ? [items[n - 1], ...items, items[0]] : items;
  // The banner runs edge to edge. Its height follows the photographs' own shape (from the first
  // slide's image; 3:2 by default) but never exceeds the screen space below the header, so the whole
  // banner is visible without scrolling. Only when the screen is shorter than the photograph is a thin
  // band trimmed from its top and bottom.
  const lead = items.find((s) => s.image?.width && s.image?.height)?.image;
  const ratio = lead ? `${lead.width} / ${lead.height}` : '3 / 2';
  const heightPerWidth = lead?.width && lead.height ? lead.height / lead.width : 2 / 3;
  const frameHeight = `max(30rem, min(${(heightPerWidth * 100).toFixed(3)}vw, calc(100svh - ${HEADER_HEIGHT})))`;

  // Position on the track: 1..n are the real slides, 0 and n + 1 the copies.
  const [pos, setPos] = useState(looped ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [moving, setMoving] = useState(false);

  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED).matches, () => false);
  // There are no on-screen controls: slides advance on their own (and by swiping on touch screens).
  // Visitors who prefer reduced motion get no auto-rotation.
  const playing = !reducedMotion && looped;
  const [hovered, setHovered] = useState(false);
  const touchX = useRef<number | null>(null);

  const move = useCallback(
    (target: number) => {
      if (!looped || moving || target === pos) return;
      if (reducedMotion) {
        setAnimate(false);
        setPos(((target - 1 + n) % n) + 1);
        return;
      }
      setAnimate(true);
      setMoving(true);
      setPos(target);
    },
    [looped, moving, pos, reducedMotion, n],
  );

  // When a slide finishes arriving, swap a copy for its real slide without animating.
  useEffect(() => {
    if (!moving) return;
    const t = setTimeout(() => {
      setMoving(false);
      if (pos === 0 || pos === n + 1) {
        setAnimate(false);
        setPos(pos === 0 ? n : 1);
      }
    }, SLIDE_MS + 40);
    return () => clearTimeout(t);
  }, [moving, pos, n]);

  // Restarts whenever the slide changes, so manual navigation resets the timer.
  useEffect(() => {
    if (!playing || hovered || moving) return;
    const t = setTimeout(() => move(pos + 1), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [playing, hovered, moving, pos, move]);

  return (
    <section aria-roledescription="carousel" aria-label="Highlights" className="bg-brand-950">
      {/* Full-bleed: no side margins, borders or rounded corners. */}
      <div className="w-full">
        <div
          className="relative isolate w-full touch-pan-y overflow-hidden bg-brand-950 lg:h-(--hero-h)"
          style={{ '--hero-ratio': ratio, '--hero-h': frameHeight } as CSSProperties}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setHovered(true)}
          onBlurCapture={() => setHovered(false)}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > SWIPE_PX) move(pos + (dx < 0 ? 1 : -1));
          }}
        >
          <div aria-live={playing ? 'off' : 'polite'} className="lg:h-full">
            <div
              className="flex lg:h-full"
              style={{
                transform: `translate3d(${-pos * 100}%, 0, 0)`,
                transition: animate ? `transform ${SLIDE_MS}ms ${EASE}` : 'none',
                willChange: 'transform',
              }}
            >
              {track.map((slide, k) => {
                const isCopy = looped && (k === 0 || k === n + 1);
                const real = looped ? (k - 1 + n) % n : k;
                const active = k === pos;
                const Heading = real === 0 && !isCopy ? 'h1' : 'h2';
                return (
                  <div
                    key={isCopy ? `copy-${k}` : slide.id}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${real + 1} of ${n}`}
                    aria-hidden={!active || undefined}
                    inert={!active}
                    className="relative flex w-full shrink-0 flex-col lg:block lg:h-full"
                  >
                    {/* Below lg the photograph keeps its own proportions at full width (nothing trimmed)
                        with the text underneath; from lg it fills the banner behind the text. */}
                    <div className="relative aspect-(--hero-ratio) w-full overflow-hidden lg:absolute lg:inset-0 lg:-z-10 lg:aspect-auto">
                      <CmsImage
                        media={slide.image}
                        slot="hero"
                        alt={slide.image_alt}
                        fill
                        fit="cover"
                        priority={real === 0 && !isCopy}
                        eager
                        className="bg-transparent!"
                        sizes="100vw"
                      />
                      <div aria-hidden className="absolute inset-0 hidden bg-linear-to-r from-brand-950/85 via-brand-950/45 via-45% to-transparent to-70% lg:block" />
                    </div>
                    {/* From lg the text lines up with the header's logo and menu (the site container). */}
                    <div className="flex-1 bg-brand-950 px-5 pt-6 pb-20 sm:px-8 lg:absolute lg:inset-0 lg:flex lg:items-center lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-10">
                      <div className="max-w-xl lg:ml-[max(2rem,calc((100%-var(--container-site))/2+2rem))]">
                        <div className="mb-4 h-1 w-14 rounded-full bg-sky-accent md:mb-5" aria-hidden />
                        <Heading className="text-[1.6rem] leading-[1.12] font-bold text-white sm:text-[2rem] md:text-[2.4rem] xl:text-[2.85rem]">{slide.title}</Heading>
                        {slide.caption && <p className="mt-3 line-clamp-3 text-base text-brand-100 md:mt-4 md:text-lg">{slide.caption}</p>}
                        <div className="mt-6 flex flex-wrap gap-3 md:mt-7">
                          {slide.button_label && slide.button_url && (
                            <ButtonLink href={slide.button_url} variant="light" size="lg">
                              {slide.button_label}
                            </ButtonLink>
                          )}
                          {slide.secondary_label && slide.secondary_url && (
                            <ButtonLink href={slide.secondary_url} variant="outline-light" size="lg" className="max-sm:hidden">
                              {slide.secondary_label}
                            </ButtonLink>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
