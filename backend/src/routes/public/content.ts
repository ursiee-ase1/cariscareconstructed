import { Router } from 'express';
import { Op, type Includeable, type WhereOptions } from 'sequelize';
import { z } from 'zod';
import {
  Article,
  Category,
  CpdProgramme,
  CpdSession,
  Event,
  EventAttachment,
  Gallery,
  GalleryItem,
  HomepageSlide,
  LmiIndicatorValue,
  LmiReport,
  MediaAsset,
  Newsletter,
  Page,
  Partner,
  Publication,
  Redirect,
  ResearchProject,
  ResearchTheme,
  SiteSetting,
  StaffGroup,
  StaffProfile,
  sequelize,
} from '../../models';
import { getMenusByKey } from '../../services/menu.service';
import { notFound } from '../../utils/errors';
import { livePublished, toPublic } from '../../utils/serialize';
import { ARTICLE_TYPES, EVENT_TYPES, PUBLICATION_TYPES } from '../../models/content';
import { pageMeta, paginate, publicListQuerySchema } from '../../validators/common';
import { inCategory } from '../../utils/queries';

export const publicContentRouter = Router();

const img = (as: string): Includeable => ({ model: MediaAsset, as });
const slugParam = z.string().trim().min(1).max(191).regex(/^[a-z0-9-]+$/i);
const getSlug = (raw: unknown) => {
  const r = slugParam.safeParse(raw);
  if (!r.success) throw notFound();
  return r.data.toLowerCase();
};

const ARTICLE_LIST_ATTRS = ['id', 'type', 'title', 'slug', 'excerpt', 'published_at', 'deadline_at', 'author_name', 'is_featured'];
const articleListInclude: Includeable[] = [
  img('featuredImage'),
  { model: Category, as: 'categories', through: { attributes: [] }, attributes: ['id', 'name', 'slug'] },
];

async function publicSettings() {
  const rows = await SiteSetting.findAll({ where: { is_public: true }, order: [['sort_order', 'asc']] });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

const activeSlides = () =>
  HomepageSlide.findAll({
    where: {
      ...livePublished(),
      [Op.and]: [
        { [Op.or]: [{ starts_at: null }, { starts_at: { [Op.lte]: new Date() } }] },
        { [Op.or]: [{ ends_at: null }, { ends_at: { [Op.gt]: new Date() } }] },
      ],
    },
    include: [img('image')],
    order: [['sort_order', 'asc']],
  });

// ------------------------------------------------------------------ site shell
publicContentRouter.get('/site', async (_req, res) => {
  const [settings, menus] = await Promise.all([publicSettings(), getMenusByKey()]);
  res.json({ data: { settings, menus } });
});

publicContentRouter.get('/slides', async (_req, res) => {
  res.json({ data: toPublic(await activeSlides()) });
});

// ------------------------------------------------------------------ homepage aggregate
publicContentRouter.get('/home', async (_req, res) => {
  const now = new Date();
  const [slides, news, announcements, publications, events, cpdSessions, themes, partners, lmi] = await Promise.all([
    activeSlides(),
    Article.findAll({
      where: { ...livePublished(), type: { [Op.notIn]: ['announcement', 'call'] } },
      attributes: ARTICLE_LIST_ATTRS,
      include: articleListInclude,
      order: [['is_featured', 'desc'], ['published_at', 'desc']],
      limit: 5,
    }),
    Article.findAll({
      where: { ...livePublished(), type: ['announcement', 'call'] },
      attributes: ARTICLE_LIST_ATTRS,
      include: [img('attachment')],
      order: [['published_at', 'desc']],
      limit: 4,
    }),
    Publication.findAll({
      where: livePublished(),
      attributes: ['id', 'type', 'title', 'slug', 'authors', 'abstract', 'publication_year', 'is_featured', 'external_url'],
      include: [img('coverImage'), img('file')],
      order: [['is_featured', 'desc'], ['publication_year', 'desc'], ['published_at', 'desc']],
      limit: 4,
    }),
    Event.findAll({
      where: { ...livePublished(), [Op.or]: [{ starts_at: { [Op.gte]: now } }, { ends_at: { [Op.gte]: now } }] },
      attributes: { exclude: ['body'] },
      include: [img('image')],
      order: [['starts_at', 'asc']],
      limit: 3,
    }),
    CpdSession.findAll({
      where: { starts_at: { [Op.gte]: now }, registration_status: { [Op.ne]: 'cancelled' } },
      include: [{ model: CpdProgramme, as: 'programme', where: livePublished(), attributes: ['id', 'title', 'slug', 'summary'], include: [img('image')] }],
      order: [['starts_at', 'asc']],
      limit: 3,
    }),
    ResearchTheme.findAll({ where: livePublished(), include: [img('image')], order: [['sort_order', 'asc']] }),
    Partner.findAll({ where: { ...livePublished(), is_featured: true }, include: [img('logo')], order: [['sort_order', 'asc']] }),
    LmiReport.findOne({ where: livePublished(), include: [img('file')], order: [['year', 'desc'], ['quarter', 'desc']] }),
  ]);
  res.json({
    data: {
      slides: toPublic(slides),
      news: toPublic(news),
      announcements: toPublic(announcements),
      publications: toPublic(publications),
      upcomingEvents: toPublic(events),
      upcomingCpdSessions: toPublic(cpdSessions),
      researchThemes: toPublic(themes),
      partners: toPublic(partners),
      latestLmi: toPublic(lmi),
    },
  });
});

// ------------------------------------------------------------------ pages & redirects
publicContentRouter.get('/pages/resolve', async (req, res) => {
  const raw = z.string().max(500).parse(req.query.path ?? '');
  const path = raw.split('?')[0].replace(/^\/+|\/+$/g, '').toLowerCase();
  const page = path
    ? await Page.findOne({
        where: { path, ...livePublished() },
        include: [img('heroImage'), img('ogImage'), { model: Page, as: 'parent', attributes: ['id', 'title', 'path'] }],
      })
    : null;
  if (page) {
    const siblings = await Page.findAll({
      where: { ...livePublished(), parent_id: page.parent_id ?? page.id },
      attributes: ['id', 'title', 'path'],
      order: [['sort_order', 'asc'], ['title', 'asc']],
    });
    return res.json({ data: { type: 'page', page: toPublic(page), siblings: toPublic(siblings) } });
  }
  const candidates = [`/${path}`, `/${path}/`];
  const redirect = await Redirect.findOne({ where: { from_path: candidates, is_enabled: true } });
  if (redirect) {
    await redirect.increment('hits');
    return res.json({ data: { type: 'redirect', to: redirect.to_path, status: redirect.status_code } });
  }
  throw notFound('Page not found');
});

// ------------------------------------------------------------------ articles
const articleQuery = publicListQuerySchema.extend({
  type: z.string().optional(),
  category: z.string().max(150).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

publicContentRouter.get('/categories', async (_req, res) => {
  const rows = await Category.findAll({
    attributes: ['id', 'name', 'slug', 'description'],
    order: [['sort_order', 'asc'], ['name', 'asc']],
  });
  res.json({ data: rows });
});

publicContentRouter.get('/articles', async (req, res) => {
  const q = articleQuery.parse(req.query);
  const types = (q.type ?? '').split(',').filter((t): t is (typeof ARTICLE_TYPES)[number] => (ARTICLE_TYPES as readonly string[]).includes(t));
  const where: Record<string | symbol, unknown> = { ...livePublished() };
  if (types.length) where.type = types;
  if (q.q) where[Op.or] = [{ title: { [Op.like]: `%${q.q}%` } }, { excerpt: { [Op.like]: `%${q.q}%` } }];
  if (q.year) where.published_at = { [Op.lte]: new Date(), [Op.gte]: new Date(Date.UTC(q.year, 0, 1)), [Op.lt]: new Date(Date.UTC(q.year + 1, 0, 1)) };
  if (q.category) {
    const cat = await Category.findOne({ where: { slug: q.category } });
    if (!cat) return res.json({ data: [], meta: pageMeta(q.page, q.pageSize, 0) });
    Object.assign(where, inCategory(String(cat.id)));
  }
  const { rows, count } = await Article.findAndCountAll({
    where: where as WhereOptions,
    attributes: ARTICLE_LIST_ATTRS,
    include: articleListInclude,
    order: [['published_at', 'desc'], ['id', 'desc']],
    distinct: true,
    ...paginate(q.page, q.pageSize),
  });
  res.json({ data: toPublic(rows), meta: pageMeta(q.page, q.pageSize, count) });
});

publicContentRouter.get('/articles/:slug', async (req, res) => {
  const article = await Article.findOne({
    where: { slug: getSlug(req.params.slug), ...livePublished() },
    include: [...articleListInclude, img('attachment'), img('ogImage')],
  });
  if (!article) throw notFound('Article not found');
  const categoryIds = (article.categories ?? []).map((c) => c.id);
  const related = await Article.findAll({
    where: {
      ...livePublished(),
      id: { [Op.ne]: article.id },
      ...(categoryIds.length
        ? { [Op.or]: [{ type: article.type }, inCategory(String(categoryIds[0]))] }
        : { type: article.type }),
    },
    attributes: ARTICLE_LIST_ATTRS,
    include: [img('featuredImage')],
    order: [['published_at', 'desc']],
    limit: 3,
  });
  res.json({ data: { ...toPublic<Record<string, unknown>>(article), related: toPublic(related) } });
});

// ------------------------------------------------------------------ research
publicContentRouter.get('/research/themes', async (_req, res) => {
  const themes = await ResearchTheme.findAll({ where: livePublished(), include: [img('image')], order: [['sort_order', 'asc']] });
  res.json({ data: toPublic(themes) });
});

publicContentRouter.get('/research/projects', async (req, res) => {
  const q = publicListQuerySchema
    .extend({
      theme: z.string().max(150).optional(),
      status: z.enum(['planned', 'ongoing', 'completed']).optional(),
      /** Only projects of this programme (e.g. ASN-RA). */
      programme: z.string().max(150).optional(),
      /** Leave out projects of this programme (programme-less projects are kept). */
      exclude_programme: z.string().max(150).optional(),
    })
    .parse(req.query);
  const where: Record<string | symbol, unknown> = { ...livePublished() };
  if (q.status) where.project_status = q.status;
  if (q.programme) where.programme = q.programme;
  else if (q.exclude_programme) where[Op.or] = [{ programme: null }, { programme: { [Op.ne]: q.exclude_programme } }];
  const themeInclude: Includeable = {
    model: ResearchTheme,
    as: 'theme',
    attributes: ['id', 'name', 'slug'],
    ...(q.theme ? { where: { slug: q.theme }, required: true } : {}),
  };
  const { rows, count } = await ResearchProject.findAndCountAll({
    where: where as WhereOptions,
    attributes: { exclude: ['body'] },
    include: [img('image'), themeInclude],
    order: [['is_featured', 'desc'], ['published_at', 'desc']],
    ...paginate(q.page, q.pageSize),
  });
  res.json({ data: toPublic(rows), meta: pageMeta(q.page, q.pageSize, count) });
});

publicContentRouter.get('/research/projects/:slug', async (req, res) => {
  const project = await ResearchProject.findOne({
    where: { slug: getSlug(req.params.slug), ...livePublished() },
    include: [img('image'), img('ogImage'), { model: ResearchTheme, as: 'theme', attributes: ['id', 'name', 'slug'] }],
  });
  if (!project) throw notFound('Project not found');
  const publications = await Publication.findAll({
    where: { ...livePublished(), research_project_id: project.id },
    attributes: ['id', 'type', 'title', 'slug', 'publication_year'],
    order: [['publication_year', 'desc']],
  });
  res.json({ data: { ...toPublic<Record<string, unknown>>(project), publications: toPublic(publications) } });
});

// ------------------------------------------------------------------ publications
const publicationQuery = publicListQuerySchema.extend({
  type: z.string().optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
  author: z.string().trim().max(150).optional(),
});

publicContentRouter.get('/publications/facets', async (_req, res) => {
  const [types, years] = await Promise.all([
    Publication.findAll({ where: livePublished(), attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['type'], raw: true }),
    Publication.findAll({
      where: { ...livePublished(), publication_year: { [Op.ne]: null } },
      attributes: ['publication_year', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['publication_year'],
      order: [['publication_year', 'desc']],
      raw: true,
    }),
  ]);
  res.json({ data: { types, years } });
});

publicContentRouter.get('/publications', async (req, res) => {
  const q = publicationQuery.parse(req.query);
  const types = (q.type ?? '').split(',').filter((t) => (PUBLICATION_TYPES as readonly string[]).includes(t));
  const where: Record<string | symbol, unknown> = { ...livePublished() };
  if (types.length) where.type = types;
  if (q.year) where.publication_year = q.year;
  if (q.author) where.authors = { [Op.like]: `%${q.author}%` };
  if (q.q) {
    where[Op.or] = ['title', 'abstract', 'authors', 'venue'].map((f) => ({ [f]: { [Op.like]: `%${q.q}%` } }));
  }
  const { rows, count } = await Publication.findAndCountAll({
    where: where as WhereOptions,
    attributes: { exclude: ['body', 'citation'] },
    include: [img('coverImage'), img('file')],
    order: [['publication_year', 'desc'], ['published_at', 'desc'], ['id', 'desc']],
    ...paginate(q.page, q.pageSize),
  });
  res.json({ data: toPublic(rows), meta: pageMeta(q.page, q.pageSize, count) });
});

publicContentRouter.get('/publications/:slug', async (req, res) => {
  const pub = await Publication.findOne({
    where: { slug: getSlug(req.params.slug), ...livePublished() },
    include: [img('coverImage'), img('file'), img('ogImage'), { model: ResearchProject, as: 'researchProject', attributes: ['id', 'title', 'slug', 'status'] }],
  });
  if (!pub) throw notFound('Publication not found');
  const related = await Publication.findAll({
    where: { ...livePublished(), type: pub.type, id: { [Op.ne]: pub.id } },
    attributes: ['id', 'type', 'title', 'slug', 'publication_year'],
    include: [img('coverImage')],
    order: [['publication_year', 'desc']],
    limit: 4,
  });
  const data = toPublic<Record<string, unknown>>(pub);
  const project = data.researchProject as { status?: string } | null;
  if (project && project.status !== 'published') data.researchProject = null;
  res.json({ data: { ...data, related: toPublic(related) } });
});

// ------------------------------------------------------------------ LMI
publicContentRouter.get('/lmi', async (_req, res) => {
  const reports = await LmiReport.findAll({
    where: livePublished(),
    attributes: { exclude: ['body'] },
    include: [img('file'), img('coverImage'), { model: LmiIndicatorValue, as: 'indicators', attributes: ['indicator', 'label', 'value'] }],
    order: [['year', 'desc'], ['quarter', 'desc']],
  });
  res.json({ data: toPublic(reports) });
});

publicContentRouter.get('/lmi/:slug', async (req, res) => {
  const report = await LmiReport.findOne({
    where: { slug: getSlug(req.params.slug), ...livePublished() },
    include: [img('file'), img('coverImage'), { model: LmiIndicatorValue, as: 'indicators', attributes: ['indicator', 'label', 'value'] }],
  });
  if (!report) throw notFound('Report not found');
  res.json({ data: toPublic(report) });
});

// ------------------------------------------------------------------ people & partners
publicContentRouter.get('/staff', async (_req, res) => {
  const groups = await StaffGroup.findAll({
    include: [
      {
        model: StaffProfile,
        as: 'members',
        where: livePublished(),
        required: false,
        attributes: ['id', 'name', 'slug', 'position', 'department', 'photo_id', 'sort_order', 'bio'],
        include: [img('photo')],
      },
    ],
    order: [['sort_order', 'asc'], [{ model: StaffProfile, as: 'members' }, 'sort_order', 'asc']],
  });
  const data = toPublic<Array<Record<string, unknown> & { members: Array<Record<string, unknown>> }>>(groups).map((g) => ({
    ...g,
    members: g.members.map(({ bio, ...m }) => ({ ...m, has_profile: Boolean(bio) })),
  }));
  res.json({ data });
});

publicContentRouter.get('/staff/:slug', async (req, res) => {
  const person = await StaffProfile.findOne({
    where: { slug: getSlug(req.params.slug), ...livePublished() },
    include: [img('photo'), { model: StaffGroup, as: 'group', attributes: ['id', 'name', 'slug'] }],
  });
  if (!person) throw notFound('Profile not found');
  res.json({ data: toPublic(person) });
});

publicContentRouter.get('/partners', async (_req, res) => {
  const partners = await Partner.findAll({ where: livePublished(), include: [img('logo')], order: [['sort_order', 'asc']] });
  res.json({ data: toPublic(partners) });
});

// ------------------------------------------------------------------ CPD
const publicSessionAttrs = { exclude: ['deleted_at'] };

publicContentRouter.get('/cpd', async (_req, res) => {
  const programmes = await CpdProgramme.findAll({
    where: livePublished(),
    attributes: { exclude: ['description'] },
    include: [img('image'), { model: CpdSession, as: 'sessions', attributes: publicSessionAttrs, required: false }],
    order: [['is_featured', 'desc'], ['published_at', 'desc'], [{ model: CpdSession, as: 'sessions' }, 'starts_at', 'desc']],
  });
  res.json({ data: toPublic(programmes) });
});

publicContentRouter.get('/cpd/:slug', async (req, res) => {
  const programme = await CpdProgramme.findOne({
    where: { slug: getSlug(req.params.slug), ...livePublished() },
    include: [img('image'), img('ogImage'), { model: CpdSession, as: 'sessions', attributes: publicSessionAttrs, required: false }],
    order: [[{ model: CpdSession, as: 'sessions' }, 'starts_at', 'asc']],
  });
  if (!programme) throw notFound('Programme not found');
  res.json({ data: toPublic(programme) });
});

// ------------------------------------------------------------------ events
const eventQuery = publicListQuerySchema.extend({
  when: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  type: z.enum(EVENT_TYPES).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

publicContentRouter.get('/events', async (req, res) => {
  const q = eventQuery.parse(req.query);
  const now = new Date();
  const where: Record<string | symbol, unknown> = { ...livePublished() };
  if (q.type) where.event_type = q.type;
  if (q.when === 'upcoming') where[Op.or] = [{ starts_at: { [Op.gte]: now } }, { ends_at: { [Op.gte]: now } }];
  if (q.when === 'past') where[Op.and] = [{ starts_at: { [Op.lt]: now } }, { [Op.or]: [{ ends_at: null }, { ends_at: { [Op.lt]: now } }] }];
  if (q.year) where.starts_at = { [Op.gte]: new Date(Date.UTC(q.year, 0, 1)), [Op.lt]: new Date(Date.UTC(q.year + 1, 0, 1)) };
  if (q.q) where.title = { [Op.like]: `%${q.q}%` };
  const { rows, count } = await Event.findAndCountAll({
    where: where as WhereOptions,
    attributes: { exclude: ['body'] },
    include: [img('image')],
    order: [['starts_at', q.when === 'upcoming' ? 'asc' : 'desc']],
    ...paginate(q.page, q.pageSize),
  });
  res.json({ data: toPublic(rows), meta: pageMeta(q.page, q.pageSize, count) });
});

publicContentRouter.get('/events/:slug', async (req, res) => {
  const event = await Event.findOne({
    where: { slug: getSlug(req.params.slug), ...livePublished() },
    include: [
      img('image'),
      img('ogImage'),
      { model: EventAttachment, as: 'attachments', include: [img('media')] },
      { model: Gallery, as: 'gallery', include: [{ model: GalleryItem, as: 'items', include: [img('media')] }] },
    ],
    order: [[{ model: EventAttachment, as: 'attachments' }, 'sort_order', 'asc']],
  });
  if (!event) throw notFound('Event not found');
  const data = toPublic<Record<string, unknown>>(event);
  if ((data.gallery as { status?: string } | null)?.status !== 'published') data.gallery = null;
  res.json({ data });
});

// ------------------------------------------------------------------ newsletters & galleries
publicContentRouter.get('/newsletters', async (req, res) => {
  const q = publicListQuerySchema.parse(req.query);
  const { rows, count } = await Newsletter.findAndCountAll({
    where: livePublished(),
    include: [img('coverImage'), img('file')],
    order: [['published_on', 'desc'], ['issue_number', 'desc']],
    ...paginate(q.page, q.pageSize),
  });
  res.json({ data: toPublic(rows), meta: pageMeta(q.page, q.pageSize, count) });
});

publicContentRouter.get('/newsletters/:slug', async (req, res) => {
  const issue = await Newsletter.findOne({
    where: { slug: getSlug(req.params.slug), ...livePublished() },
    include: [img('coverImage'), img('file')],
  });
  if (!issue) throw notFound('Newsletter not found');
  res.json({ data: toPublic(issue) });
});

publicContentRouter.get('/galleries', async (req, res) => {
  const q = publicListQuerySchema.parse(req.query);
  const { rows, count } = await Gallery.findAndCountAll({
    where: livePublished(),
    include: [img('coverImage')],
    order: [['published_at', 'desc']],
    ...paginate(q.page, q.pageSize),
  });
  res.json({ data: toPublic(rows), meta: pageMeta(q.page, q.pageSize, count) });
});

publicContentRouter.get('/galleries/:slug', async (req, res) => {
  const gallery = await Gallery.findOne({
    where: { slug: getSlug(req.params.slug), ...livePublished() },
    include: [img('coverImage'), { model: GalleryItem, as: 'items', include: [img('media')] }],
    order: [[{ model: GalleryItem, as: 'items' }, 'sort_order', 'asc']],
  });
  if (!gallery) throw notFound('Gallery not found');
  res.json({ data: toPublic(gallery) });
});

// ------------------------------------------------------------------ sitemap feed
publicContentRouter.get('/sitemap', async (_req, res) => {
  const attrs = ['slug', 'updated_at'];
  const [pages, articles, publications, events, projects, staff, cpd, newsletters, galleries] = await Promise.all([
    Page.findAll({ where: { ...livePublished(), show_in_sitemap: true }, attributes: ['path', 'updated_at'], raw: true }),
    Article.findAll({ where: livePublished(), attributes: attrs, raw: true }),
    Publication.findAll({ where: livePublished(), attributes: attrs, raw: true }),
    Event.findAll({ where: livePublished(), attributes: attrs, raw: true }),
    ResearchProject.findAll({ where: livePublished(), attributes: attrs, raw: true }),
    StaffProfile.findAll({ where: { ...livePublished(), bio: { [Op.ne]: null } }, attributes: attrs, raw: true }),
    CpdProgramme.findAll({ where: livePublished(), attributes: attrs, raw: true }),
    Newsletter.findAll({ where: livePublished(), attributes: attrs, raw: true }),
    Gallery.findAll({ where: livePublished(), attributes: attrs, raw: true }),
  ]);
  res.json({ data: { pages, articles, publications, events, projects, staff, cpd, newsletters, galleries } });
});
