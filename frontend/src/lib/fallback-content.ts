import type { Media, Partner } from '@/types/api';

const logo = (id: number, file: string, name: string, width: number, height: number): Media => ({
  id,
  url: `/partners/${file}`,
  kind: 'image',
  mime_type: 'image/svg+xml',
  size_bytes: 0,
  width,
  height,
  alt_text: `${name} logo`,
  caption: null,
  title: name,
  original_name: file,
});

/**
 * Current CARISCA partners, used only when the content API cannot be reached, so the Partners page
 * still shows verified information. Mirrors the published records (Admin › Partners, seeded from
 * backend/src/seeders/data/curated.ts); the API remains the source of truth whenever it responds.
 */
export const FALLBACK_PARTNERS: Partner[] = [
  {
    id: -1,
    name: 'Kwame Nkrumah University of Science and Technology (KNUST)',
    slug: 'kwame-nkrumah-university-of-science-and-technology-knust',
    partner_type: 'host',
    description: 'CARISCA is an interdisciplinary centre of excellence established at KNUST, Kumasi, Ghana.',
    website_url: 'https://www.knust.edu.gh/',
    logo: logo(-1, 'knust.svg', 'Kwame Nkrumah University of Science and Technology (KNUST)', 125, 58),
  },
  {
    id: -2,
    name: 'LEARN Logistics by Kühne Foundation',
    slug: 'learn-logistics-by-kuhne-foundation',
    partner_type: 'funder',
    description: 'The Centre is supported by LEARN Logistics by Kühne Foundation.',
    website_url: null,
    logo: logo(-2, 'learn-logistics.svg', 'LEARN Logistics by Kühne Foundation', 157, 65),
  },
];
