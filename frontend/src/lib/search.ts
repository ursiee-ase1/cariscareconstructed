/** Result types offered by site search (the API's `type` filter), with their display labels. */
export const SEARCH_TYPES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'news', label: 'News' },
  { value: 'publication', label: 'Publications' },
  { value: 'event', label: 'Events' },
  { value: 'research', label: 'Research' },
  { value: 'training', label: 'Training' },
  { value: 'page', label: 'Pages' },
];

export const searchTypeLabel = (type: string) => SEARCH_TYPES.find((t) => t.value === type)?.label ?? type;

/** Shortest query the search API accepts. */
export const MIN_QUERY_LENGTH = 2;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A pattern matching the words of a query anywhere in a text, case-insensitively. Mirrors the
 * search API, which matches words of three or more letters by prefix ("logi" finds "logistics");
 * a query of only shorter words is matched as typed. Null when there is nothing to highlight.
 */
export function highlightPattern(query: string): RegExp | null {
  const cleaned = query.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length >= 3);
  const terms = (words.length ? words : cleaned ? [cleaned] : []).slice(0, 8);
  if (!terms.length) return null;
  // Longest first, so "logistics" wins over "log" where both would match.
  const alternatives = [...new Set(terms)].sort((a, b) => b.length - a.length).map(escapeRegExp);
  return new RegExp(`(${alternatives.join('|')})`, 'giu');
}
