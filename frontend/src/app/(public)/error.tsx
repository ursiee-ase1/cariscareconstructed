'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/** Shown when content cannot be loaded (e.g. the API is temporarily unreachable). */
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-site py-24 text-center">
      <p className="eyebrow">Temporarily unavailable</p>
      <h1 className="mt-3 text-3xl font-bold">We couldn’t load this page</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
        The content service may be briefly unavailable. Please try again in a moment. If the problem continues, contact us at the
        details in the footer.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-11 items-center gap-2 rounded-(--radius-control) bg-brand-700 px-5 font-display font-semibold text-white hover:bg-brand-800"
      >
        <RefreshCw aria-hidden className="size-4" /> Try again
      </button>
    </div>
  );
}
