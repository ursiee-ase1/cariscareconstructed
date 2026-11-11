import 'server-only';
import { cache } from 'react';
import { apiGet, apiGetOrNull } from '@/lib/api';
import type {
  ApiList,
  Article,
  ArticleSummary,
  Category,
  CpdProgramme,
  EventItem,
  Gallery,
  HomeData,
  LmiReport,
  Newsletter,
  PageResolution,
  Partner,
  Publication,
  ResearchProject,
  ResearchTheme,
  SearchResponse,
  SiteData,
  StaffGroup,
  StaffMember,
} from '@/types/api';

/**
 * Typed accessors for the public API. Cache tags mirror the tags the backend purges
 * (see backend/src/routes/admin/resources.ts) so edits appear without a rebuild.
 */
type Data<T> = { data: T };

const tag = (...t: string[]) => ({ tags: t });

export const getSite = cache(async () => (await apiGet<Data<SiteData>>('/site', tag('settings', 'menus'))).data);

export const getHome = async () =>
  (await apiGet<Data<HomeData>>('/home', tag('home', 'articles', 'events', 'publications', 'cpd', 'slides', 'lmi', 'research', 'partners'))).data;

export const resolvePage = cache(async (path: string) => {
  const r = await apiGetOrNull<Data<PageResolution>>('/pages/resolve', { query: { path }, tags: ['pages', `page:${path.replace(/^\//, '')}`, 'redirects'] });
  return r?.data ?? null;
});

// ------------------------------------------------------------------ news
export const getArticles = (query: { page?: number; pageSize?: number; type?: string; category?: string; q?: string; year?: number }) =>
  apiGet<ApiList<ArticleSummary>>('/articles', { query, tags: ['articles'] });

export const getArticle = cache(async (slug: string) => (await apiGetOrNull<Data<Article>>(`/articles/${slug}`, tag('articles', `articles:${slug}`)))?.data ?? null);

export const getCategories = async () => (await apiGet<Data<Category[]>>('/categories', tag('categories'))).data;

// ------------------------------------------------------------------ research & publications
export const getResearchThemes = async () => (await apiGet<Data<ResearchTheme[]>>('/research/themes', tag('research'))).data;

export const getResearchProjects = (query: { page?: number; pageSize?: number; theme?: string; status?: string; programme?: string; exclude_programme?: string }) =>
  apiGet<ApiList<ResearchProject>>('/research/projects', { query, tags: ['research'] });

/** Programme name that marks Africa Supply Network Research Accelerator projects (shown on /asn-ra). */
export const ASN_RA_PROGRAMME = 'ASN-RA';
export const isAsnRaProject = (p: Pick<ResearchProject, 'programme'>) => p.programme?.trim().toUpperCase() === ASN_RA_PROGRAMME;

/** ASN-RA research projects, newest first. */
export const getAsnRaProjects = async () => (await getResearchProjects({ programme: ASN_RA_PROGRAMME, pageSize: 50 })).data.filter(isAsnRaProject);

/** Research projects outside ASN-RA (which has its own page). */
export const getNonAsnRaProjects = async (query: { page?: number; pageSize?: number; theme?: string; status?: string }) => {
  const list = await getResearchProjects({ ...query, exclude_programme: ASN_RA_PROGRAMME });
  const data = list.data.filter((p) => !isAsnRaProject(p));
  // An API without the programme filter returns ASN-RA projects too; drop them from the count as well.
  const removed = list.data.length - data.length;
  return { data, meta: { ...list.meta, total: Math.max(0, list.meta.total - removed) } };
};

export const getResearchProject = cache(
  async (slug: string) => (await apiGetOrNull<Data<ResearchProject>>(`/research/projects/${slug}`, tag('research', `research:${slug}`)))?.data ?? null,
);

export const getPublications = (query: { page?: number; pageSize?: number; type?: string; year?: number; q?: string; author?: string }) =>
  apiGet<ApiList<Publication>>('/publications', { query, tags: ['publications'] });

export const getPublicationFacets = async () =>
  (
    await apiGet<Data<{ types: Array<{ type: string; count: number }>; years: Array<{ publication_year: number; count: number }> }>>(
      '/publications/facets',
      tag('publications'),
    )
  ).data;

export const getPublication = cache(
  async (slug: string) => (await apiGetOrNull<Data<Publication>>(`/publications/${slug}`, tag('publications', `publications:${slug}`)))?.data ?? null,
);

export const getLmiReports = async () => (await apiGet<Data<LmiReport[]>>('/lmi', tag('lmi'))).data;

// ------------------------------------------------------------------ people
export const getStaff = async () => (await apiGet<Data<StaffGroup[]>>('/staff', tag('staff'))).data;
export const getStaffMember = cache(async (slug: string) => (await apiGetOrNull<Data<StaffMember>>(`/staff/${slug}`, tag('staff', `staff:${slug}`)))?.data ?? null);
export const getPartners = async () => (await apiGet<Data<Partner[]>>('/partners', tag('partners'))).data;

// ------------------------------------------------------------------ training & events
export const getCpdProgrammes = async () => (await apiGet<Data<CpdProgramme[]>>('/cpd', tag('cpd'))).data;
export const getCpdProgramme = cache(async (slug: string) => (await apiGetOrNull<Data<CpdProgramme>>(`/cpd/${slug}`, tag('cpd', `cpd:${slug}`)))?.data ?? null);

export const getEvents = (query: { when?: 'upcoming' | 'past' | 'all'; page?: number; pageSize?: number; type?: string; year?: number; q?: string }) =>
  apiGet<ApiList<EventItem>>('/events', { query, tags: ['events'] });

export const getEvent = cache(async (slug: string) => (await apiGetOrNull<Data<EventItem>>(`/events/${slug}`, tag('events', `events:${slug}`)))?.data ?? null);

export const getNewsletters = (query: { page?: number; pageSize?: number }) => apiGet<ApiList<Newsletter>>('/newsletters', { query, tags: ['newsletters'] });
export const getNewsletter = cache(async (slug: string) => (await apiGetOrNull<Data<Newsletter>>(`/newsletters/${slug}`, tag('newsletters', `newsletters:${slug}`)))?.data ?? null);

export const getGalleries = (query: { page?: number; pageSize?: number }) => apiGet<ApiList<Gallery>>('/galleries', { query, tags: ['galleries'] });
export const getGallery = cache(async (slug: string) => (await apiGetOrNull<Data<Gallery>>(`/galleries/${slug}`, tag('galleries', `galleries:${slug}`)))?.data ?? null);

// ------------------------------------------------------------------ search & sitemap
export const search = (query: { q: string; type?: string; page?: number }) =>
  apiGet<SearchResponse>('/search', { query, tags: ['search'], revalidate: 60 });

export interface SitemapFeed {
  pages: Array<{ path: string; updated_at: string }>;
  [key: string]: Array<{ slug?: string; path?: string; updated_at: string }>;
}
export const getSitemapFeed = async () => (await apiGet<Data<SitemapFeed>>('/sitemap', { tags: ['sitemap'], revalidate: 3600 })).data;
