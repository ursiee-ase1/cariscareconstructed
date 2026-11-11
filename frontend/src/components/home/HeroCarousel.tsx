'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import type { Slide } from '@/types/api';
import { ButtonLink } from '../ui/Button';
import { CmsImage } from '../ui/CmsImage';

const INTERVAL_MS = 5000;
const SLIDE_MS = 950;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SWIPE_PX = 40;
const REDUCED = '(prefers-reduced-motion: reduce)';
const subscribeReducedMotion = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/**
 * Homepage hero banner (WAI-ARIA carousel pattern). Slides travel right to left; the track is
 * bookended with copies of the last and first slides so wrapping keeps the same direction, then
 * jumps (invisibly) back to the real slide. Auto-rotation pauses on hover/focus, can be paused by
 * the visitor, and is off when reduced motion is preferred, which also removes the sliding.
 */
export function HeroCarousel({ slides, fallbackTitle, fallbackCaption }: { slides: Slide[]; fallbackTitle: string; fallbackCaption?: string | null }) {
  const items: Slide[] = slides.length
    ? slides
    : [{ id: 0, title: fallbackTitle, caption: fallbackCaption ?? null, image: null, image_alt: null, button_label: 'About CARISCA', button_url: '/about', secondary_label: null, secondary_url: null }];
  const n = items.length;
  const looped = n > 1;
  const track = looped ? [items[n - 1], ...items, items[0]] : items;
  // The banner takes the photographs' own shape (from the first slide's image), so the image fills
  // the full width and the height follows; nothing is cropped. Falls back to 3:2, the hero photos' ratio.
  const lead = items.find((s) => s.image?.width && s.image?.height)?.image;
  const ratio = lead ? `${lead.width} / ${lead.height}` : '3 / 2';

  // Position on the track: 1..n are the real slides, 0 and n + 1 the copies.
  const [pos, setPos] = useState(looped ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [moving, setMoving] = useState(false);
  const current = looped ? (pos - 1 + n) % n : 0;

  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED).matches, () => false);
  // Visitors who prefer reduced motion get no auto-rotation unless they press play.
  const [userPlaying, setPlaying] = useState<boolean | null>(null);
  const playing = (userPlaying ?? !reducedMotion) && looped;
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
    <section aria-roledescription="carousel" aria-label="Highlights" className="bg-white pt-3 sm:pt-4 md:pt-5">
      {/* Wider than the site container so the photograph reaches towards the viewport edges. */}
      <div className="mx-auto w-full max-w-[120rem] px-3 sm:px-4 lg:px-6">
        <div
          className="relative isolate w-full touch-pan-y overflow-hidden rounded-(--radius-card) bg-brand-950 lg:aspect-(--hero-ratio)"
          style={{ '--hero-ratio': ratio } as CSSProperties}
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
                    {/* The photograph is never cropped: the frame has the photograph's own proportions, so
                        it fills the full width. Only a slide whose image has a different shape leaves
                        spare space, which is filled with a softened copy of the same photograph. */}
                    <div className="relative aspect-(--hero-ratio) w-full overflow-hidden lg:absolute lg:inset-0 lg:-z-10 lg:aspect-auto">
                      {slide.image && (
                        <div aria-hidden className="absolute inset-0 max-lg:hidden">
                          <CmsImage media={slide.image} slot="hero" alt="" fill fit="cover" eager className="scale-110 opacity-55 blur-2xl" sizes="(min-width:1024px) 95vw, 100vw" />
                        </div>
                      )}
                      <CmsImage
                        media={slide.image}
                        slot="hero"
                        alt={slide.image_alt}
                        fill
                        fit="contain"
                        priority={real === 0 && !isCopy}
                        eager
                        className="bg-transparent!"
                        sizes="(min-width:1920px) 1872px, 98vw"
                      />
                      <div aria-hidden className="absolute inset-0 hidden bg-linear-to-r from-brand-950/85 via-brand-950/45 via-45% to-transparent to-70% lg:block" />
                    </div>
                    <div className="flex-1 bg-brand-950 px-5 pt-6 pb-20 sm:px-8 lg:absolute lg:inset-0 lg:flex lg:items-center lg:bg-transparent lg:px-10 lg:pt-0 lg:pb-10 lg:px-14 xl:px-20">
                      <div className="max-w-xl">
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

          {looped && (
            <div className="absolute right-4 bottom-4 flex items-center gap-2 md:right-6 md:bottom-5">
              <button type="button" onClick={() => setPlaying(!playing)} className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30" aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>
                {playing ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
              </button>
              <button type="button" onClick={() => move(pos - 1)} className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30" aria-label="Previous slide">
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <div className="flex gap-1.5 px-1">
                {items.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => move(i + 1)}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === current ? 'true' : undefined}
                    className={`h-2.5 rounded-full transition-all ${i === current ? 'w-7 bg-sky-accent' : 'w-2.5 bg-white/60 hover:bg-white'}`}
                  />
                ))}
              </div>
              <button type="button" onClick={() => move(pos + 1)} className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30" aria-label="Next slide">
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
