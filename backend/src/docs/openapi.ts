/**
 * OpenAPI 3.1 description of the CARISCA API.
 *
 * Request bodies are generated from the same Zod schemas the routes use to validate input, and the
 * admin CRUD paths are generated from the resource list the router is built from
 * (routes/admin/resources.ts). The documentation therefore stays in step with validation rules
 * and with the set of admin resources. Response shapes are described by hand below.
 */
import { z, type ZodType } from 'zod';
import { env } from '../config/env';
import { ARTICLE_TYPES, EVENT_TYPES, PARTNER_TYPES, PUBLICATION_TYPES } from '../models/content';
import { PUBLISH_STATUSES } from '../models/_shared';
import { resources } from '../routes/admin/resources';
import { mediaMetaSchema } from '../routes/admin/media';
import { menuTreeSchema } from '../routes/admin/menus';
import {
  registrationStatusSchema,
  settingsUpdateSchema,
  submissionStatusSchema,
  subscriberStatusSchema,
} from '../routes/admin/operations';
import { createUserSchema, setPasswordSchema, updateUserSchema } from '../routes/admin/users';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema } from '../routes/auth.routes';
import { contactSchema, registrationSchema, subscribeSchema, tokenSchema } from '../routes/public/forms';

type Json = Record<string, unknown>;

// ---------------------------------------------------------------------------- helpers
/**
 * JSON Schema (2020-12, as used by OpenAPI 3.1) for what a client may send. Local `$defs`
 * (produced for recursive schemas such as the menu tree) are hoisted into components.schemas so
 * their `$ref`s still resolve once the schema is embedded in the document.
 */
function fromZod(name: string, schema: ZodType): Json {
  const out = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Json;
  delete out.$schema;
  const defs = (out.$defs ?? {}) as Record<string, Json>;
  delete out.$defs;
  const rename = (key: string) => `${name}_${key.replace(/[^A-Za-z0-9_]/g, '')}`;
  const rewrite = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(rewrite);
    if (!node || typeof node !== 'object') return node;
    const obj: Json = {};
    for (const [k, v] of Object.entries(node)) {
      obj[k] = k === '$ref' && typeof v === 'string' && v.startsWith('#/$defs/') ? `#/components/schemas/${rename(v.slice(8))}` : rewrite(v);
    }
    return obj;
  };
  for (const [key, def] of Object.entries(defs)) schemas[rename(key)] = rewrite(def) as Json;
  return rewrite(out) as Json;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema: Json, required = true) => ({ required, content: { 'application/json': { schema } } });
const dataOf = (schema: Json) => ({ type: 'object', required: ['data'], properties: { data: schema } });
const listOf = (schema: Json) => ({
  type: 'object',
  required: ['data', 'meta'],
  properties: { data: { type: 'array', items: schema }, meta: ref('PageMeta') },
});
const ok = (schema: Json, description = 'OK') => ({ description, content: { 'application/json': { schema } } });
const errorResponse = (description: string, code: string, message: string, fields?: Array<{ path: string; message: string }>) => ({
  description,
  content: {
    'application/json': { schema: ref('Error'), example: { error: { code, message, ...(fields ? { fields } : {}) } } },
  },
});

const R = {
  400: errorResponse('Bad request', 'bad_request', 'The event cannot end before it starts.'),
  401: errorResponse('Not signed in', 'unauthorized', 'Authentication required'),
  403: errorResponse('Missing permission, invalid CSRF token or disallowed Origin', 'forbidden', 'You do not have permission to perform this action'),
  404: errorResponse('Not found (or not published)', 'not_found', 'Not found'),
  409: errorResponse('Conflict', 'conflict', 'A record with the same unique value already exists.', [{ path: 'slug', message: 'slug must be unique' }]),
  413: errorResponse('Payload too large', 'payload_too_large', 'Request body is too large.'),
  422: errorResponse('Validation error — see `error.fields`', 'validation_error', 'Some fields are invalid.', [{ path: 'email', message: 'Enter a valid email address' }]),
  429: errorResponse('Rate limited', 'rate_limited', 'Too many requests. Please try again later.'),
  503: errorResponse('Service unavailable', 'service_unavailable', 'The service is temporarily unavailable.'),
};
const noContent = { description: 'No content' };

const pathParam = (name: string, schema: Json = { type: 'string' }, description?: string) => ({
  name,
  in: 'path',
  required: true,
  schema,
  ...(description ? { description } : {}),
});
const query = (name: string, schema: Json, description?: string) => ({
  name,
  in: 'query',
  required: false,
  schema,
  ...(description ? { description } : {}),
});
const idParam = pathParam('id', { type: 'integer', minimum: 1 });
const slugParam = pathParam('slug', { type: 'string', pattern: '^[a-z0-9-]+$' });
const pageParams = (max = 50) => [
  query('page', { type: 'integer', minimum: 1, default: 1 }),
  query('pageSize', { type: 'integer', minimum: 1, maximum: max }),
];
const csvFormat = query('format', { type: 'string', enum: ['csv'] }, 'Return a CSV download instead of JSON (the export is audited).');

/** Security requirement for admin routes: session cookie AND CSRF token (for state-changing requests). */
const adminSecurity = (mutating: boolean) => [mutating ? { sessionCookie: [], csrfToken: [] } : { sessionCookie: [] }];
const needs = (perm: string) => `Requires permission \`${perm}\`.`;

// ---------------------------------------------------------------------------- shared component schemas
const nullableString = { type: ['string', 'null'] };
const dateTime = { type: 'string', format: 'date-time' };
const nullableDateTime = { type: ['string', 'null'], format: 'date-time' };

const schemas: Record<string, Json> = {
  Error: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', examples: ['validation_error'] },
          message: { type: 'string' },
          fields: {
            type: 'array',
            items: { type: 'object', properties: { path: { type: 'string' }, message: { type: 'string' } } },
          },
          details: {},
        },
      },
    },
    example: {
      error: {
        code: 'validation_error',
        message: 'Some fields are invalid.',
        fields: [{ path: 'email', message: 'Enter a valid email address' }],
      },
    },
  },
  PageMeta: {
    type: 'object',
    required: ['page', 'pageSize', 'total', 'totalPages'],
    properties: {
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
      total: { type: 'integer' },
      totalPages: { type: 'integer' },
    },
  },
  PublishStatus: { type: 'string', enum: [...PUBLISH_STATUSES] },
  Media: {
    type: 'object',
    description: 'Public media object. Private files are never included in public responses.',
    properties: {
      id: { type: 'integer' },
      url: { type: 'string', format: 'uri' },
      kind: { type: 'string', enum: ['image', 'document', 'video', 'other'] },
      mime_type: { type: 'string' },
      size_bytes: { type: 'integer' },
      width: { type: ['integer', 'null'] },
      height: { type: ['integer', 'null'] },
      alt_text: nullableString,
      caption: nullableString,
      title: nullableString,
      original_name: { type: 'string' },
    },
  },
  AdminMedia: {
    allOf: [
      ref('Media'),
      {
        type: 'object',
        properties: {
          visibility: { type: 'string', enum: ['public', 'private'] },
          filename: { type: 'string' },
          storage_path: { type: 'string' },
          checksum: nullableString,
          source_url: nullableString,
          uploaded_by: { type: ['integer', 'null'] },
          created_at: dateTime,
          updated_at: dateTime,
          usages: {
            type: 'array',
            description: 'Only on GET /admin/media/{id}.',
            items: { type: 'object', properties: { label: { type: 'string' }, count: { type: 'integer' } } },
          },
        },
      },
    ],
  },
  MenuNode: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      label: { type: 'string' },
      href: { type: 'string' },
      url: nullableString,
      description: nullableString,
      open_in_new_tab: { type: 'boolean' },
      is_enabled: { type: 'boolean' },
      external: { type: 'boolean' },
      children: { type: 'array', items: ref('MenuNode') },
    },
  },
  Category: {
    type: 'object',
    properties: { id: { type: 'integer' }, name: { type: 'string' }, slug: { type: 'string' }, description: nullableString },
  },
  ArticleSummary: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      type: { type: 'string', enum: [...ARTICLE_TYPES] },
      title: { type: 'string' },
      slug: { type: 'string' },
      excerpt: nullableString,
      published_at: dateTime,
      deadline_at: nullableDateTime,
      author_name: nullableString,
      is_featured: { type: 'boolean' },
      featuredImage: { oneOf: [ref('Media'), { type: 'null' }] },
      categories: { type: 'array', items: ref('Category') },
    },
  },
  Article: {
    allOf: [
      ref('ArticleSummary'),
      {
        type: 'object',
        properties: {
          body: { type: ['string', 'null'], description: 'Sanitised HTML' },
          attachment: { oneOf: [ref('Media'), { type: 'null' }] },
          seo_title: nullableString,
          seo_description: nullableString,
          related: { type: 'array', items: ref('ArticleSummary') },
        },
      },
    ],
  },
  Page: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      path: { type: 'string', examples: ['about/directors-message'] },
      template: { type: 'string', enum: ['standard', 'wide', 'landing'] },
      summary: nullableString,
      body: nullableString,
      heroImage: { oneOf: [ref('Media'), { type: 'null' }] },
      parent: { type: ['object', 'null'], properties: { id: { type: 'integer' }, title: { type: 'string' }, path: { type: 'string' } } },
      updated_at: dateTime,
    },
  },
  Publication: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      type: { type: 'string', enum: [...PUBLICATION_TYPES] },
      title: { type: 'string' },
      slug: { type: 'string' },
      authors: nullableString,
      abstract: nullableString,
      publication_year: { type: ['integer', 'null'] },
      venue: nullableString,
      doi: nullableString,
      external_url: nullableString,
      citation: nullableString,
      coverImage: { oneOf: [ref('Media'), { type: 'null' }] },
      file: { oneOf: [ref('Media'), { type: 'null' }] },
    },
  },
  EventItem: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      slug: { type: 'string' },
      event_type: { type: 'string', enum: [...EVENT_TYPES] },
      summary: nullableString,
      body: nullableString,
      starts_at: dateTime,
      ends_at: nullableDateTime,
      all_day: { type: 'boolean' },
      venue: nullableString,
      location_type: { type: 'string', enum: ['in_person', 'online', 'hybrid'] },
      cost_text: nullableString,
      registration_url: nullableString,
      website_url: nullableString,
      image: { oneOf: [ref('Media'), { type: 'null' }] },
    },
  },
  LmiReport: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      slug: { type: 'string' },
      year: { type: 'integer' },
      quarter: { type: ['integer', 'null'] },
      period_label: { type: 'string' },
      lmi_value: { type: ['string', 'null'], description: 'Decimal as string, e.g. "63.5"' },
      future_lmi_value: nullableString,
      value_source_url: nullableString,
      summary: nullableString,
      file: { oneOf: [ref('Media'), { type: 'null' }] },
      indicators: {
        type: 'array',
        items: { type: 'object', properties: { indicator: { type: 'string' }, label: { type: 'string' }, value: { type: 'string' } } },
      },
    },
  },
  StaffMember: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      slug: { type: 'string' },
      position: nullableString,
      department: nullableString,
      bio: nullableString,
      has_profile: { type: 'boolean', description: 'In group listings: true when a biography exists.' },
      photo: { oneOf: [ref('Media'), { type: 'null' }] },
    },
  },
  Partner: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      slug: { type: 'string' },
      partner_type: { type: 'string', enum: [...PARTNER_TYPES] },
      description: nullableString,
      website_url: nullableString,
      logo: { oneOf: [ref('Media'), { type: 'null' }] },
    },
  },
  CpdSession: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      programme_id: { type: 'integer' },
      starts_at: dateTime,
      ends_at: nullableDateTime,
      venue: nullableString,
      delivery_mode: { type: 'string', enum: ['in_person', 'online', 'hybrid'] },
      fee_text: nullableString,
      capacity: { type: ['integer', 'null'] },
      registration_status: { type: 'string', enum: ['open', 'closed', 'full', 'cancelled'] },
      registration_url: nullableString,
      allow_online_registration: { type: 'boolean' },
    },
  },
  CpdProgramme: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      slug: { type: 'string' },
      summary: nullableString,
      description: nullableString,
      facilitators: nullableString,
      fee_text: nullableString,
      image: { oneOf: [ref('Media'), { type: 'null' }] },
      sessions: { type: 'array', items: ref('CpdSession') },
    },
  },
  Newsletter: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      issue_number: { type: ['integer', 'null'] },
      title: { type: 'string' },
      slug: { type: 'string' },
      published_on: { type: ['string', 'null'], format: 'date' },
      summary: nullableString,
      highlights: nullableString,
      online_url: nullableString,
      coverImage: { oneOf: [ref('Media'), { type: 'null' }] },
      file: { oneOf: [ref('Media'), { type: 'null' }] },
    },
  },
  Gallery: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      slug: { type: 'string' },
      description: nullableString,
      coverImage: { oneOf: [ref('Media'), { type: 'null' }] },
      items: {
        type: 'array',
        items: { type: 'object', properties: { id: { type: 'integer' }, caption: nullableString, media: ref('Media') } },
      },
    },
  },
  ResearchTheme: {
    type: 'object',
    properties: { id: { type: 'integer' }, name: { type: 'string' }, slug: { type: 'string' }, summary: nullableString, icon: nullableString },
  },
  ResearchProject: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      slug: { type: 'string' },
      summary: nullableString,
      problem: nullableString,
      contribution: nullableString,
      relevance: nullableString,
      project_status: { type: 'string', enum: ['planned', 'ongoing', 'completed'] },
      programme: nullableString,
      lead_researchers: nullableString,
      theme: { type: ['object', 'null'], properties: { id: { type: 'integer' }, name: { type: 'string' }, slug: { type: 'string' } } },
    },
  },
  SearchResult: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['news', 'publication', 'event', 'page', 'research', 'training'] },
      title: { type: 'string' },
      url: { type: 'string', description: 'Path on the public website' },
      snippet: { type: 'string' },
      date: { type: ['string', 'integer', 'null'] },
      score: { type: 'number' },
    },
  },
  FormResult: {
    type: 'object',
    properties: { ok: { type: 'boolean' }, message: { type: 'string' }, status: { type: 'string' } },
  },
  Session: {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          status: { type: 'string', enum: ['active', 'disabled'] },
          last_login_at: nullableDateTime,
        },
      },
      roles: { type: 'array', items: { type: 'string' } },
      permissions: { type: 'array', items: { type: 'string' } },
      csrfToken: { type: 'string', description: 'Send as `X-CSRF-Token` on POST/PATCH/PUT/DELETE.' },
      sessionExpiresAt: dateTime,
    },
  },
  AdminUser: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      status: { type: 'string', enum: ['active', 'disabled'] },
      last_login_at: nullableDateTime,
      roles: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, label: { type: 'string' } } } },
    },
  },
  AdminRecord: {
    type: 'object',
    description:
      'A stored record: the fields of the matching input schema plus `id`, `created_at`, `updated_at`, ' +
      '`created_by`, `updated_by`, `review_note`, and related media/associations.',
    properties: { id: { type: 'integer' }, created_at: dateTime, updated_at: dateTime },
    additionalProperties: true,
  },
  AuditLog: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      user_id: { type: ['integer', 'null'] },
      user_email: nullableString,
      action: { type: 'string', examples: ['publish'] },
      entity_type: nullableString,
      entity_id: nullableString,
      summary: nullableString,
      changes: { type: ['string', 'null'], description: 'JSON-encoded before/after diff (secrets excluded)' },
      created_at: dateTime,
    },
  },
};

// Input schemas generated from the validators.
const inputs: Record<string, ZodType> = {
  LoginInput: loginSchema,
  ChangePasswordInput: changePasswordSchema,
  ForgotPasswordInput: forgotPasswordSchema,
  ResetPasswordInput: resetPasswordSchema,
  ContactInput: contactSchema,
  SubscribeInput: subscribeSchema,
  SubscriberTokenInput: tokenSchema,
  CpdRegistrationInput: registrationSchema,
  MenuTreeInput: menuTreeSchema,
  MediaMetaInput: mediaMetaSchema,
  SettingsUpdateInput: settingsUpdateSchema,
  SubmissionStatusInput: submissionStatusSchema,
  SubscriberStatusInput: subscriberStatusSchema,
  RegistrationStatusInput: registrationStatusSchema,
  CreateUserInput: createUserSchema,
  UpdateUserInput: updateUserSchema,
  SetPasswordInput: setPasswordSchema,
};

const pascal = (s: string) => s.replace(/(^|-)([a-z])/g, (_m, _d, c: string) => c.toUpperCase());

// ---------------------------------------------------------------------------- paths
function publicPaths(): Json {
  const get = (tag: string, summary: string, response: Json, params: Json[] = [], extra: Json = {}) => ({
    get: { tags: [tag], summary, parameters: params, responses: { 200: ok(response), ...extra } },
  });
  return {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        security: [],
        responses: {
          200: ok({ type: 'object', properties: { status: { type: 'string' }, database: { type: 'string' }, time: dateTime } }),
          503: ok({ type: 'object' }, 'Database unavailable'),
        },
      },
    },
    '/site': get('Public content', 'Site settings and navigation menus', dataOf({
      type: 'object',
      properties: {
        settings: { type: 'object', additionalProperties: nullableString },
        menus: { type: 'object', additionalProperties: { type: 'array', items: ref('MenuNode') } },
      },
    })),
    '/home': get('Public content', 'Homepage bundle (slides, news, announcements, publications, events, CPD, themes, partners, latest LMI)', dataOf({ type: 'object' })),
    '/slides': get('Public content', 'Active homepage slides', dataOf({ type: 'array', items: { type: 'object' } })),
    '/pages/resolve': get(
      'Public content',
      'Resolve a path to a CMS page or a legacy redirect',
      dataOf({
        oneOf: [
          { type: 'object', properties: { type: { const: 'page' }, page: ref('Page'), siblings: { type: 'array', items: { type: 'object' } } } },
          { type: 'object', properties: { type: { const: 'redirect' }, to: { type: 'string' }, status: { type: 'integer' } } },
        ],
      }),
      [{ ...query('path', { type: 'string' }, 'e.g. /about-us/centre-driectors-message/'), required: true }],
      { 404: R[404] },
    ),
    '/categories': get('Public content', 'News topics', dataOf({ type: 'array', items: ref('Category') })),
    '/articles': get('Public content', 'List published articles', listOf(ref('ArticleSummary')), [
      ...pageParams(),
      query('type', { type: 'string' }, `Comma-separated: ${ARTICLE_TYPES.join(', ')}`),
      query('category', { type: 'string' }, 'Category slug'),
      query('year', { type: 'integer' }),
      query('q', { type: 'string', maxLength: 200 }),
    ]),
    '/articles/{slug}': get('Public content', 'Get a published article with related stories', dataOf(ref('Article')), [slugParam], { 404: R[404] }),
    '/research/themes': get('Public content', 'Research themes', dataOf({ type: 'array', items: ref('ResearchTheme') })),
    '/research/projects': get('Public content', 'Research projects', listOf(ref('ResearchProject')), [
      ...pageParams(),
      query('theme', { type: 'string' }, 'Theme slug'),
      query('status', { type: 'string', enum: ['planned', 'ongoing', 'completed'] }),
      query('programme', { type: 'string' }, 'Only projects of this programme, e.g. ASN-RA'),
      query('exclude_programme', { type: 'string' }, 'Leave out projects of this programme'),
    ]),
    '/research/projects/{slug}': get('Public content', 'Research project with its publications', dataOf(ref('ResearchProject')), [slugParam], { 404: R[404] }),
    '/publications': get('Public content', 'List publications', listOf(ref('Publication')), [
      ...pageParams(),
      query('type', { type: 'string' }, `Comma-separated: ${PUBLICATION_TYPES.join(', ')}`),
      query('year', { type: 'integer' }),
      query('author', { type: 'string' }),
      query('q', { type: 'string' }),
    ]),
    '/publications/facets': get('Public content', 'Publication counts by type and year', dataOf({
      type: 'object',
      properties: { types: { type: 'array', items: { type: 'object' } }, years: { type: 'array', items: { type: 'object' } } },
    })),
    '/publications/{slug}': get('Public content', 'Get a publication with related items', dataOf(ref('Publication')), [slugParam], { 404: R[404] }),
    '/lmi': get('Public content', 'All published Ghana LMI reports (newest first)', dataOf({ type: 'array', items: ref('LmiReport') })),
    '/lmi/{slug}': get('Public content', 'One LMI report', dataOf(ref('LmiReport')), [slugParam], { 404: R[404] }),
    '/staff': get('Public content', 'Staff groups with members', dataOf({
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, slug: { type: 'string' }, description: nullableString, members: { type: 'array', items: ref('StaffMember') } } },
    })),
    '/staff/{slug}': get('Public content', 'Staff profile', dataOf(ref('StaffMember')), [slugParam], { 404: R[404] }),
    '/partners': get('Public content', 'Partners', dataOf({ type: 'array', items: ref('Partner') })),
    '/cpd': get('Public content', 'CPD programmes with sessions', dataOf({ type: 'array', items: ref('CpdProgramme') })),
    '/cpd/{slug}': get('Public content', 'CPD programme', dataOf(ref('CpdProgramme')), [slugParam], { 404: R[404] }),
    '/events': get('Public content', 'List events', listOf(ref('EventItem')), [
      ...pageParams(),
      query('when', { type: 'string', enum: ['upcoming', 'past', 'all'], default: 'upcoming' }),
      query('type', { type: 'string', enum: [...EVENT_TYPES] }),
      query('year', { type: 'integer' }),
      query('q', { type: 'string' }),
    ]),
    '/events/{slug}': get('Public content', 'Event with attachments and gallery', dataOf(ref('EventItem')), [slugParam], { 404: R[404] }),
    '/newsletters': get('Public content', 'Newsletter issues', listOf(ref('Newsletter')), pageParams()),
    '/newsletters/{slug}': get('Public content', 'Newsletter issue', dataOf(ref('Newsletter')), [slugParam], { 404: R[404] }),
    '/galleries': get('Public content', 'Galleries', listOf(ref('Gallery')), pageParams()),
    '/galleries/{slug}': get('Public content', 'Gallery with items', dataOf(ref('Gallery')), [slugParam], { 404: R[404] }),
    '/sitemap': get('Public content', 'Slugs, paths and modification dates for the XML sitemap', dataOf({ type: 'object' })),
    '/search': get(
      'Search',
      'Full-text search across published content',
      {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              type: { type: 'string' },
              results: { type: 'array', items: ref('SearchResult') },
              counts: { type: 'object', additionalProperties: { type: 'integer' } },
            },
          },
          meta: ref('PageMeta'),
        },
      },
      [
        { ...query('q', { type: 'string', minLength: 2, maxLength: 200 }), required: true },
        query('type', { type: 'string', enum: ['all', 'news', 'publication', 'event', 'page', 'research', 'training'], default: 'all' }),
        ...pageParams(30),
      ],
      { 422: R[422] },
    ),
  };
}

function formPaths(): Json {
  const form = (summary: string, input: string, description: string, created = '201') => ({
    post: {
      tags: ['Public forms'],
      summary,
      description: `${description}\n\nAnti-spam: \`website\` must be empty (honeypot) and \`startedAt\` (ms epoch when the form was shown) must be at least 2.5 s ago. Rate-limited to 8 per 10 minutes per IP.`,
      requestBody: jsonBody(ref(input)),
      responses: { [created]: ok(dataOf(ref('FormResult'))), 400: R[400], 409: R[409], 422: R[422], 429: R[429] },
    },
  });
  return {
    '/contact': form('Submit the contact form', 'ContactInput', 'Stores a private submission visible only to authorised administrators.'),
    '/subscribers': form(
      'Subscribe to the newsletter',
      'SubscribeInput',
      'Returns 201 for a new sign-up and 200 (same message) if already subscribed. Double opt-in when SMTP is configured; otherwise single opt-in with recorded consent.',
    ),
    '/subscribers/confirm': form('Confirm a newsletter subscription', 'SubscriberTokenInput', 'Token from the confirmation email.', '200'),
    '/subscribers/unsubscribe': form('Unsubscribe from the newsletter', 'SubscriberTokenInput', 'Token from any newsletter email.', '200'),
    '/cpd/sessions/{id}/register': {
      post: {
        ...form('Register for a CPD session', 'CpdRegistrationInput', 'Only for sessions with online registration open. Returns `status: waitlisted` when the session is full; 409 if already registered.').post,
        parameters: [idParam],
      },
    },
  };
}

function authPaths(): Json {
  return {
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in',
        description:
          'Sets the HTTP-only session cookie and returns the CSRF token. Limited to 10 attempts per 15 minutes per IP + email; the account locks for 15 minutes after 8 failures.\n\n' +
          '**In this Swagger UI:** sign in here, copy `data.csrfToken`, then click **Authorize** and paste it into `csrfToken`.',
        security: [],
        requestBody: jsonBody(ref('LoginInput')),
        responses: { 200: ok(dataOf(ref('Session'))), 401: R[401], 403: R[403], 422: R[422], 429: R[429] },
      },
    },
    '/auth/logout': {
      post: { tags: ['Authentication'], summary: 'Sign out', security: adminSecurity(true), responses: { 204: noContent } },
    },
    '/auth/me': {
      get: { tags: ['Authentication'], summary: 'Current session', security: adminSecurity(false), responses: { 200: ok(dataOf(ref('Session'))), 401: R[401] } },
    },
    '/auth/change-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Change own password',
        description: 'Signs out the user’s other sessions. Passwords need 12+ characters with upper- and lower-case letters and a number.',
        security: adminSecurity(true),
        requestBody: jsonBody(ref('ChangePasswordInput')),
        responses: { 200: ok(dataOf({ type: 'object' })), 400: R[400], 401: R[401], 403: R[403] },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Request a password-reset email',
        description: 'Returns 503 `email_not_configured` when SMTP is not set up. Otherwise the same response whether or not the account exists.',
        security: [],
        requestBody: jsonBody(ref('ForgotPasswordInput')),
        responses: { 200: ok(dataOf(ref('FormResult'))), 429: R[429], 503: R[503] },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset password with an emailed token',
        security: [],
        requestBody: jsonBody(ref('ResetPasswordInput')),
        responses: { 200: ok(dataOf({ type: 'object' })), 400: R[400], 429: R[429] },
      },
    },
  };
}

function resourcePaths(): Json {
  const paths: Json = {};
  for (const [segment, cfg] of resources) {
    const tag = `Admin: ${segment}`;
    const inputName = `${pascal(segment)}Input`;
    schemas[inputName] = fromZod(inputName, cfg.schema);
    const p = cfg.permission;
    const attrs = cfg.model.getAttributes();
    const filterParams = Object.keys(cfg.filters ?? {}).map((f) => query(f, { type: 'string' }, 'Resource-specific filter'));
    const listParams = [
      ...pageParams(100),
      query('q', { type: 'string' }, `Searches ${(cfg.searchFields ?? []).join(', ') || 'nothing'}`),
      ...(cfg.publishable ? [query('status', { type: 'string', enum: [...PUBLISH_STATUSES, 'scheduled'] })] : []),
      query('sort', { type: 'string' }),
      query('dir', { type: 'string', enum: ['asc', 'desc'] }),
      query('mine', { type: 'boolean' }, 'Only records created by the current user'),
      ...(cfg.model.options.paranoid ? [query('trashed', { type: 'boolean' }, 'List soft-deleted records')] : []),
      ...filterParams,
    ];
    const workflow = cfg.publishable
      ? '\n\nPublishing workflow: setting `status` to `published` or `archived` additionally needs `' + p + '.publish`. Users with only `' + p + '.update_own` may edit their own unpublished records.'
      : '';

    paths[`/admin/${segment}`] = {
      get: {
        tags: [tag],
        summary: `List ${segment}`,
        description: needs(`${p}.read`),
        security: adminSecurity(false),
        parameters: listParams,
        responses: { 200: ok(listOf(ref('AdminRecord'))), 401: R[401], 403: R[403] },
      },
      post: {
        tags: [tag],
        summary: `Create ${segment}`,
        description: needs(`${p}.create`) + (cfg.slugFrom ? ' A unique slug is generated when `slug` is blank.' : '') + workflow,
        security: adminSecurity(true),
        requestBody: jsonBody(ref(inputName)),
        responses: { 201: ok(dataOf(ref('AdminRecord')), 'Created'), 400: R[400], 401: R[401], 403: R[403], 409: R[409], 422: R[422] },
      },
    };
    paths[`/admin/${segment}/{id}`] = {
      parameters: [idParam],
      get: {
        tags: [tag],
        summary: `Get one ${segment} record`,
        description: needs(`${p}.read`),
        security: adminSecurity(false),
        responses: { 200: ok(dataOf(ref('AdminRecord'))), 401: R[401], 403: R[403], 404: R[404] },
      },
      patch: {
        tags: [tag],
        summary: `Update ${segment}`,
        description: `Partial update (any subset of the input fields). ${needs(`${p}.update`)}${workflow}`,
        security: adminSecurity(true),
        requestBody: jsonBody(ref(inputName)),
        responses: { 200: ok(dataOf(ref('AdminRecord'))), 400: R[400], 401: R[401], 403: R[403], 404: R[404], 409: R[409], 422: R[422] },
      },
      delete: {
        tags: [tag],
        summary: `Delete ${segment}`,
        description: `${needs(`${p}.delete`)}${cfg.model.options.paranoid ? ' Soft delete — restorable.' : ''}`,
        security: adminSecurity(true),
        responses: { 204: noContent, 401: R[401], 403: R[403], 404: R[404] },
      },
    };
    if (cfg.model.options.paranoid) {
      paths[`/admin/${segment}/{id}/restore`] = {
        post: {
          tags: [tag],
          summary: `Restore a deleted ${segment} record`,
          description: needs(`${p}.delete`),
          security: adminSecurity(true),
          parameters: [idParam],
          responses: { 200: ok(dataOf(ref('AdminRecord'))), 401: R[401], 403: R[403], 404: R[404] },
        },
      };
    }
    if (attrs.sort_order) {
      paths[`/admin/${segment}/reorder`] = {
        post: {
          tags: [tag],
          summary: `Reorder ${segment}`,
          description: `Sets \`sort_order\` to the position of each id. ${needs(`${p}.update`)}`,
          security: adminSecurity(true),
          requestBody: jsonBody({ type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'integer' }, minItems: 1, maxItems: 500 } } }),
          responses: { 200: ok(dataOf({ type: 'object' })), 401: R[401], 403: R[403], 422: R[422] },
        },
      };
    }
  }
  return paths;
}

function adminPaths(): Json {
  const listParams = (extra: Json[] = []) => [...pageParams(100), query('q', { type: 'string' }), ...extra];
  const statusPatch = (tag: string, perm: string, input: string) => ({
    tags: [tag],
    summary: 'Change status',
    description: needs(perm),
    security: adminSecurity(true),
    requestBody: jsonBody(ref(input)),
    responses: { 200: ok(dataOf({ type: 'object' })), 401: R[401], 403: R[403], 404: R[404], 422: R[422] },
  });
  const del = (tag: string, perm: string) => ({
    tags: [tag],
    summary: 'Delete permanently',
    description: needs(perm),
    security: adminSecurity(true),
    responses: { 204: noContent, 401: R[401], 403: R[403], 404: R[404] },
  });
  const multipart = (properties: Json, required: string[]) => ({
    required: true,
    content: { 'multipart/form-data': { schema: { type: 'object', required, properties } } },
  });

  return {
    '/admin/dashboard': {
      get: {
        tags: ['Admin: dashboard'],
        summary: 'Dashboard counts and recent activity',
        description: 'Any signed-in user. Recent activity is included only with `audit.read`.',
        security: adminSecurity(false),
        responses: { 200: ok(dataOf({ type: 'object' })), 401: R[401] },
      },
    },
    '/admin/media': {
      get: {
        tags: ['Admin: media'],
        summary: 'List media',
        description: needs('media.read'),
        security: adminSecurity(false),
        parameters: listParams([query('kind', { type: 'string', enum: ['image', 'document', 'video', 'other'] })]),
        responses: { 200: ok(listOf(ref('AdminMedia'))), 401: R[401], 403: R[403] },
      },
      post: {
        tags: ['Admin: media'],
        summary: 'Upload a file',
        description:
          `${needs('media.create')} Allowed: jpg, jpeg, png, gif, webp, svg (no scripts), pdf, doc(x), xls(x), ppt(x), csv, txt. ` +
          'Content is checked against the extension. Images up to `UPLOAD_MAX_IMAGE_MB` (default 5), documents up to `UPLOAD_MAX_DOCUMENT_MB` (default 25).',
        security: adminSecurity(true),
        requestBody: multipart(
          {
            file: { type: 'string', format: 'binary' },
            alt_text: { type: 'string', maxLength: 500 },
            caption: { type: 'string', maxLength: 1000 },
            title: { type: 'string', maxLength: 255 },
            visibility: { type: 'string', enum: ['public', 'private'] },
          },
          ['file'],
        ),
        responses: { 201: ok(dataOf(ref('AdminMedia')), 'Uploaded'), 400: R[400], 401: R[401], 403: R[403], 413: R[413] },
      },
    },
    '/admin/media/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Admin: media'],
        summary: 'Get a file with its usages',
        description: needs('media.read'),
        security: adminSecurity(false),
        responses: { 200: ok(dataOf(ref('AdminMedia'))), 401: R[401], 403: R[403], 404: R[404] },
      },
      patch: {
        tags: ['Admin: media'],
        summary: 'Edit alt text, caption or title',
        description: needs('media.update'),
        security: adminSecurity(true),
        requestBody: jsonBody(ref('MediaMetaInput')),
        responses: { 200: ok(dataOf(ref('AdminMedia'))), 401: R[401], 403: R[403], 404: R[404] },
      },
      delete: {
        tags: ['Admin: media'],
        summary: 'Delete a file',
        description: `${needs('media.delete')} Returns 409 with \`details.usages\` while the file is referenced.`,
        security: adminSecurity(true),
        responses: { 204: noContent, 401: R[401], 403: R[403], 404: R[404], 409: R[409] },
      },
    },
    '/admin/media/{id}/replace': {
      post: {
        tags: ['Admin: media'],
        summary: 'Replace the file behind a media record',
        description: `${needs('media.update')} The new file must be the same kind (image/document). Every page referencing the record shows the new file.`,
        security: adminSecurity(true),
        parameters: [idParam],
        requestBody: multipart({ file: { type: 'string', format: 'binary' } }, ['file']),
        responses: { 200: ok(dataOf(ref('AdminMedia'))), 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      },
    },
    '/admin/media/{id}/download': {
      get: {
        tags: ['Admin: media'],
        summary: 'Download a file (including private files)',
        description: needs('media.read'),
        security: adminSecurity(false),
        parameters: [idParam],
        responses: { 200: { description: 'File stream', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } }, 401: R[401], 403: R[403], 404: R[404] },
      },
    },
    '/admin/menus': {
      get: {
        tags: ['Admin: menus'],
        summary: 'All menus as trees (including hidden items)',
        description: needs('menus.read'),
        security: adminSecurity(false),
        responses: { 200: ok(dataOf({ type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, key: { type: 'string' }, name: { type: 'string' }, items: { type: 'array', items: ref('MenuNode') } } } })), 401: R[401], 403: R[403] },
      },
    },
    '/admin/menus/{key}': {
      put: {
        tags: ['Admin: menus'],
        summary: 'Replace a menu tree',
        description: `${needs('menus.update')} At most 3 levels; each item needs a URL, a linked page, or children. Linked pages must exist.`,
        security: adminSecurity(true),
        parameters: [pathParam('key', { type: 'string', enum: ['main', 'footer', 'utility'] })],
        requestBody: jsonBody(ref('MenuTreeInput')),
        responses: { 200: ok(dataOf({ type: 'object' })), 400: R[400], 401: R[401], 403: R[403], 404: R[404], 422: R[422] },
      },
    },
    '/admin/settings': {
      get: {
        tags: ['Admin: settings'],
        summary: 'All site settings',
        description: needs('settings.read'),
        security: adminSecurity(false),
        responses: { 200: ok(dataOf({ type: 'array', items: { type: 'object' } })), 401: R[401], 403: R[403] },
      },
      patch: {
        tags: ['Admin: settings'],
        summary: 'Update settings by key',
        description: `${needs('settings.update')} Keys must exist; email and URL settings are validated.`,
        security: adminSecurity(true),
        requestBody: jsonBody(ref('SettingsUpdateInput')),
        responses: { 200: ok(dataOf({ type: 'array', items: { type: 'object' } })), 400: R[400], 401: R[401], 403: R[403] },
      },
    },
    '/admin/submissions': {
      get: {
        tags: ['Admin: inbox'],
        summary: 'Contact submissions',
        description: `${needs('submissions.read')} Private personal data.`,
        security: adminSecurity(false),
        parameters: listParams([query('state', { type: 'string', enum: ['new', 'read', 'replied', 'archived', 'spam'] }), query('topic', { type: 'string' }), csvFormat]),
        responses: { 200: ok(listOf({ type: 'object' })), 401: R[401], 403: R[403] },
      },
    },
    '/admin/submissions/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Admin: inbox'],
        summary: 'Get a submission (marks it read)',
        description: needs('submissions.read'),
        security: adminSecurity(false),
        responses: { 200: ok(dataOf({ type: 'object' })), 401: R[401], 403: R[403], 404: R[404] },
      },
      patch: statusPatch('Admin: inbox', 'submissions.update', 'SubmissionStatusInput'),
      delete: del('Admin: inbox', 'submissions.delete'),
    },
    '/admin/subscribers': {
      get: {
        tags: ['Admin: inbox'],
        summary: 'Newsletter subscribers',
        description: needs('subscribers.read'),
        security: adminSecurity(false),
        parameters: listParams([query('state', { type: 'string', enum: ['pending', 'subscribed', 'unsubscribed'] }), csvFormat]),
        responses: { 200: ok(listOf({ type: 'object' })), 401: R[401], 403: R[403] },
      },
    },
    '/admin/subscribers/{id}': {
      parameters: [idParam],
      patch: statusPatch('Admin: inbox', 'subscribers.update', 'SubscriberStatusInput'),
      delete: del('Admin: inbox', 'subscribers.delete'),
    },
    '/admin/registrations': {
      get: {
        tags: ['Admin: inbox'],
        summary: 'CPD registrations',
        description: needs('registrations.read'),
        security: adminSecurity(false),
        parameters: listParams([query('session', { type: 'integer' }), query('state', { type: 'string', enum: ['pending', 'confirmed', 'waitlisted', 'cancelled'] }), csvFormat]),
        responses: { 200: ok(listOf({ type: 'object' })), 401: R[401], 403: R[403] },
      },
    },
    '/admin/registrations/{id}': {
      parameters: [idParam],
      patch: statusPatch('Admin: inbox', 'registrations.update', 'RegistrationStatusInput'),
      delete: del('Admin: inbox', 'registrations.delete'),
    },
    '/admin/audit-logs': {
      get: {
        tags: ['Admin: audit'],
        summary: 'Audit log',
        description: needs('audit.read'),
        security: adminSecurity(false),
        parameters: listParams([query('entity', { type: 'string' }), query('action', { type: 'string' }), query('user', { type: 'integer' })]),
        responses: { 200: ok(listOf(ref('AuditLog'))), 401: R[401], 403: R[403] },
      },
    },
    '/admin/users/roles': {
      get: {
        tags: ['Admin: users'],
        summary: 'Roles with their permissions',
        description: needs('users.read'),
        security: adminSecurity(false),
        responses: { 200: ok(dataOf({ type: 'array', items: { type: 'object' } })), 401: R[401], 403: R[403] },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin: users'],
        summary: 'List users',
        description: needs('users.read'),
        security: adminSecurity(false),
        parameters: listParams(),
        responses: { 200: ok(listOf(ref('AdminUser'))), 401: R[401], 403: R[403] },
      },
      post: {
        tags: ['Admin: users'],
        summary: 'Create a user',
        description: `${needs('users.create')} Only a Super Administrator can assign the super_admin role.`,
        security: adminSecurity(true),
        requestBody: jsonBody(ref('CreateUserInput')),
        responses: { 201: ok(dataOf(ref('AdminUser')), 'Created'), 400: R[400], 401: R[401], 403: R[403], 409: R[409], 422: R[422] },
      },
    },
    '/admin/users/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Admin: users'],
        summary: 'Get a user',
        description: needs('users.read'),
        security: adminSecurity(false),
        responses: { 200: ok(dataOf(ref('AdminUser'))), 401: R[401], 403: R[403], 404: R[404] },
      },
      patch: {
        tags: ['Admin: users'],
        summary: 'Update a user (name, email, status, roles)',
        description: `${needs('users.update')} At least one active Super Administrator must remain; role or status changes end the user’s sessions.`,
        security: adminSecurity(true),
        requestBody: jsonBody(ref('UpdateUserInput')),
        responses: { 200: ok(dataOf(ref('AdminUser'))), 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      },
      delete: {
        tags: ['Admin: users'],
        summary: 'Delete a user',
        description: `${needs('users.delete')} You cannot delete yourself or the last Super Administrator.`,
        security: adminSecurity(true),
        responses: { 204: noContent, 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      },
    },
    '/admin/users/{id}/password': {
      post: {
        tags: ['Admin: users'],
        summary: 'Set a user’s password',
        description: `${needs('users.update')} Used when email password reset is unavailable.`,
        security: adminSecurity(true),
        parameters: [idParam],
        requestBody: jsonBody(ref('SetPasswordInput')),
        responses: { 200: ok(dataOf({ type: 'object' })), 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      },
    },
  };
}

// ---------------------------------------------------------------------------- document
export function buildOpenApiSpec() {
  for (const [name, schema] of Object.entries(inputs)) schemas[name] = fromZod(name, schema);
  const paths = { ...publicPaths(), ...formPaths(), ...authPaths(), ...resourcePaths(), ...adminPaths() };

  return {
    openapi: '3.1.0',
    info: {
      title: 'CARISCA Website API',
      version: '1.0.0',
      description: [
        'REST API for the website of the Centre for Applied Research and Innovation in Supply Chain – Africa (CARISCA), KNUST.',
        '',
        '**Responses:** `{ "data": … }`, plus `meta` (page, pageSize, total, totalPages) on lists. Errors: `{ "error": { code, message, fields? } }`.',
        '',
        '**Public endpoints** return only published content (`status = published` and `published_at <= now`); internal fields are removed.',
        '',
        '**Admin endpoints** need the `carisca_sid` session cookie from `POST /auth/login`. Every POST/PATCH/PUT/DELETE also needs the `X-CSRF-Token` header (the `csrfToken` from login or `/auth/me`) and an allowed `Origin`. Permissions are checked on every request; each operation lists the permission it needs, and **Admin › Users & roles** shows what each role has.',
        '',
        '**Using Try it out:** call `POST /auth/login` (the browser keeps the cookie), copy `data.csrfToken`, click **Authorize**, and paste it into **csrfToken**.',
      ].join('\n'),
      contact: { name: 'CARISCA', url: 'https://carisca.knust.edu.gh/' },
    },
    servers: [{ url: `${env.API_PUBLIC_URL.replace(/\/$/, '')}/api/v1`, description: 'This server' }],
    tags: [
      { name: 'System' },
      { name: 'Public content', description: 'Published content for the website (no authentication).' },
      { name: 'Search' },
      { name: 'Public forms', description: 'Contact, newsletter and CPD registration.' },
      { name: 'Authentication' },
      { name: 'Admin: dashboard' },
      ...resources.map(([segment]) => ({ name: `Admin: ${segment}` })),
      { name: 'Admin: media' },
      { name: 'Admin: menus' },
      { name: 'Admin: settings' },
      { name: 'Admin: inbox', description: 'Contact submissions, newsletter subscribers and CPD registrations (private data).' },
      { name: 'Admin: users' },
      { name: 'Admin: audit' },
    ],
    security: [],
    paths,
    components: {
      schemas,
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: env.SESSION_COOKIE_NAME,
          description: 'HTTP-only session cookie set by POST /auth/login.',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token',
          description: 'The csrfToken returned by /auth/login or /auth/me. Required on state-changing admin requests.',
        },
      },
    },
  };
}
