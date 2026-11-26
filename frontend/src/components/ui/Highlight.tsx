import { highlightPattern } from '@/lib/search';

/** Renders `text` with the words of `query` marked (used for search results and previews). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const pattern = highlightPattern(query);
  if (!pattern || !text) return <>{text}</>;
  // split() with a capturing group puts the matches at the odd positions.
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-xs bg-gold/45 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
