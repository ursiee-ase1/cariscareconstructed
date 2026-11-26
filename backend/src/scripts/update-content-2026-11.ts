/**
 * Content update, November 2026. Applies to an existing database the content changes that the
 * seeders apply to a fresh one. Safe to run more than once: each step only acts when needed, and
 * nothing is deleted.
 *
 *   npm run content:update-2026-11 -- --dry-run   # report what would change
 *   UPLOAD_MAX_IMAGE_MB=20 npm run content:update-2026-11   # apply (one original cover is 6 MB)
 *
 * 1. Partnerships: ASU and ISCEA are archived (hidden from the website, kept in the dashboard).
 * 2. Publications: original cover images from the legacy Publications & Resources page are
 *    downloaded into the media library and attached to reports that have no cover yet.
 * 3. ASN-RA: the verified ASN-RA meetings are added as events (listed on /asn-ra).
 * 4. Summit: the header button and main-menu link point to the 2027 Summit instead of 2026.
 * 5. KNUST: the low-resolution partner logo is replaced with a sharp vector version.
 * 6. CPDs: registration links move from the old CPD site (cpd.carisca.org) to the events portal.
 * 7. Training pages: the imported Academic Programmes, Professional Training, Scholarships and
 *    Masterclass pages get a tidy structure (same wording; duplicates and broken links removed).
 * 8. Section pages without an image get one from their own content, and images whose files
 *    were deleted from the legacy site are replaced by archived copies or removed.
 * 9. The Masterclass and Innovations Lab pages are taken off the website (archived), and their
 *    addresses redirect to the Training and Research sections.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { Op } from 'sequelize';
import { CpdProgramme, CpdSession, Event, MediaAsset, MenuItem, Page, Partner, Publication, Redirect, SiteSetting, sequelize } from '../models';
import { legacyOriginal, sectionPageImages, type ImageSource } from '../seeders/data/section-images';
import { trainingPageUpdates } from '../seeders/data/training-pages';
import { sha256 } from '../utils/crypto';
import { sanitizeRichText } from '../utils/html';
import { seedAsnRaMeetings } from '../seeders/content';
import { asnRaMeetings, partners, publications } from '../seeders/data/curated';
import { storeUpload } from '../services/media.service';
import { revalidateFrontend } from '../services/revalidate.service';
import { slugify } from '../utils/slug';

const DRY_RUN = process.argv.includes('--dry-run');
const LEGACY_HOST = 'carisca.knust.edu.gh';
const log = (msg: string) => console.log(`${DRY_RUN ? '[dry run] ' : ''}${msg}`);

async function archivePartners() {
  let changed = 0;
  for (const p of partners) {
    if (!('status' in p) || p.status !== 'archived') continue;
    const row = await Partner.findOne({ where: { slug: slugify(p.name) } });
    if (!row) {
      log(`Partner not found (nothing to archive): ${p.name}`);
      continue;
    }
    if (row.status === 'archived') continue;
    log(`Archive partner: ${p.name} (was ${row.status})`);
    if (!DRY_RUN) await row.update({ status: 'archived' });
    changed++;
  }
  return changed;
}

/** Legacy-site files, or the Internet Archive's copy of one that has since been deleted. */
const isAllowedSource = (url: string) => {
  const u = new URL(url);
  return u.host === LEGACY_HOST || (u.host === 'web.archive.org' && u.pathname.includes(`/https://${LEGACY_HOST}/wp-content/uploads/`));
};

async function downloadImage(url: string, alt: string) {
  if (!isAllowedSource(url)) throw new Error(`Refusing to download from ${url}`);
  const existing = await MediaAsset.findOne({ where: { source_url: url } });
  if (existing) return existing;
  const res = await fetch(url, { headers: { 'user-agent': 'CARISCA-migration/1.0' }, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const originalname = decodeURIComponent(path.posix.basename(new URL(url).pathname));
  return storeUpload(
    { originalname, buffer, size: buffer.length, mimetype: '', fieldname: 'file', encoding: '7bit' } as Express.Multer.File,
    { alt_text: alt, caption: null, title: null, source_url: url },
  );
}

async function attachPublicationCovers() {
  let changed = 0;
  const failures: string[] = [];
  for (const p of publications) {
    if (!p.cover_source) continue;
    const pub = await Publication.findOne({ where: { slug: slugify(p.title) } });
    if (!pub) {
      log(`Publication not found: ${p.title}`);
      continue;
    }
    if (pub.cover_image_id) continue; // never replace a cover chosen in the dashboard
    log(`Attach cover to "${p.title}" ← ${p.cover_source}`);
    if (DRY_RUN) {
      changed++;
      continue;
    }
    try {
      const cover = await downloadImage(p.cover_source, `Cover of ${p.title}`);
      await pub.update({ cover_image_id: cover.id });
      changed++;
    } catch (err) {
      failures.push(`${p.title}: ${(err as Error).message}`);
    }
  }
  return { changed, failures };
}

async function addAsnRaMeetings() {
  if (!DRY_RUN) return seedAsnRaMeetings();
  let missing = 0;
  for (const m of asnRaMeetings) {
    if (await Event.findOne({ where: { slug: m.slug }, paranoid: false })) continue;
    log(`Create event: ${m.title} (${m.starts_at.slice(0, 10)})`);
    missing++;
  }
  return missing;
}

const OLD_SUMMIT_URL = 'https://summit2026.carisca.org/';
const SUMMIT = { url: 'https://summit2027.carisca.org/', label: '2027 Summit' };

/** Moves the summit setting and menu link from 2026 to 2027; values edited to anything else are left alone. */
async function updateSummitLinks() {
  let changed = 0;
  const settings = [
    ['summit_url', OLD_SUMMIT_URL, SUMMIT.url],
    ['summit_label', '2026 Summit', SUMMIT.label],
  ] as const;
  for (const [key, from, to] of settings) {
    const row = await SiteSetting.findOne({ where: { key } });
    if (!row || row.value !== from) continue;
    log(`Setting ${key}: ${from} → ${to}`);
    if (!DRY_RUN) await row.update({ value: to });
    changed++;
  }
  for (const item of await MenuItem.findAll({ where: { url: OLD_SUMMIT_URL } })) {
    const label = item.label === '2026 Summit' ? SUMMIT.label : item.label;
    log(`Menu item #${item.id} "${item.label}" → "${label}" (${SUMMIT.url})`);
    if (!DRY_RUN) await item.update({ url: SUMMIT.url, label });
    changed++;
  }
  return changed;
}

/**
 * Replaces the imported Training pages with tidied versions (same wording, proper structure). A
 * page is only touched while its body is still exactly as imported; photos still linked from the
 * legacy site are copied into the media library first.
 */
async function tidyTrainingPages() {
  let changed = 0;
  const failures: string[] = [];
  for (const update of trainingPageUpdates) {
    const page = await Page.findOne({ where: { path: update.path } });
    if (!page) {
      log(`Page not found: ${update.path}`);
      continue;
    }
    const current = sha256(page.body ?? '');
    if (current !== update.importedSha256 && !update.replacesSha256?.includes(current)) {
      log(`Skip ${update.path}: edited since import (or already tidied)`);
      continue;
    }
    log(`Tidy page ${update.path}${update.hero && !page.hero_image_id ? ' (and set its hero image)' : ''}`);
    if (DRY_RUN) {
      changed++;
      continue;
    }
    try {
      let body = update.body;
      for (const [, url] of [...body.matchAll(/src="legacy:([^"]+)"/g)]) {
        const asset = await downloadImage(url, '');
        const size = asset.width && asset.height ? ` width="${asset.width}" height="${asset.height}"` : '';
        body = body.replace(`src="legacy:${url}"`, `src="${asset.url}"${size}`);
      }
      const values: { body: string | null; hero_image_id?: number } = { body: sanitizeRichText(body) };
      if (update.hero && !page.hero_image_id) {
        const hero = update.hero.legacy
          ? await downloadImage(update.hero.legacy, update.hero.alt)
          : await MediaAsset.findOne({ where: { storage_path: { [Op.like]: `%/${update.hero.existingFile}` } } });
        if (hero) values.hero_image_id = hero.id;
      }
      await page.update(values);
      changed++;
    } catch (err) {
      failures.push(`${update.path}: ${(err as Error).message}`);
    }
  }
  return { changed, failures };
}

async function resolveImage(source: ImageSource) {
  if (source.existingFile) return MediaAsset.findOne({ where: { storage_path: { [Op.like]: `%/${source.existingFile}` } } });
  return downloadImage((source.archived ?? source.legacy)!, source.alt);
}

/**
 * Body images whose files are gone from the legacy site are replaced by the archived copy already
 * in the media library (same file name), or removed. Images that still load are left alone.
 */
async function repairBodyImages(body: string) {
  let out = body;
  let fixed = 0;
  for (const [tag, src] of [...body.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)]) {
    const original = legacyOriginal(src);
    if (!original) continue;
    const head = await fetch(original, { method: 'HEAD', signal: AbortSignal.timeout(30_000) }).catch(() => null);
    if (!head || head.status !== 404) continue;
    const name = path.posix.basename(new URL(original).pathname);
    const copy = await MediaAsset.findOne({ where: { source_url: { [Op.like]: `https://web.archive.org/%/${name}` } } });
    out = out.replace(tag, copy?.url ? `<img src="${copy.url}" alt="${copy.alt_text ?? ''}" />` : '');
    fixed++;
  }
  return { body: out, fixed };
}

/** Gives section pages without an image one from their own content (see seeders/data/section-images.ts). */
async function addSectionPageImages() {
  let changed = 0;
  const failures: string[] = [];
  for (const item of sectionPageImages) {
    const page = await Page.findOne({ where: { path: item.path } });
    if (!page) {
      log(`Page not found: ${item.path}`);
      continue;
    }
    const needsHero = Boolean(item.hero && !page.hero_image_id);
    const needsShare = Boolean(item.share && !page.og_image_id);
    if (!needsHero && !needsShare && !item.repairBodyImages) continue;
    try {
      const values: { hero_image_id?: number; og_image_id?: number; body?: string | null } = {};
      if (needsHero) {
        log(`Set title-band image for ${item.path}`);
        const img = DRY_RUN ? null : await resolveImage(item.hero!);
        if (img) values.hero_image_id = img.id;
      }
      if (needsShare) {
        log(`Set sharing image for ${item.path}`);
        const img = DRY_RUN ? null : await resolveImage(item.share!);
        if (img) values.og_image_id = img.id;
      }
      if (item.repairBodyImages && page.body && !DRY_RUN) {
        const repaired = await repairBodyImages(page.body);
        if (repaired.fixed) {
          log(`Repair ${repaired.fixed} missing image(s) in ${item.path}`);
          values.body = sanitizeRichText(repaired.body);
        }
      }
      if (Object.keys(values).length) {
        await page.update(values);
        changed++;
      } else if (DRY_RUN && (needsHero || needsShare)) changed++;
    } catch (err) {
      failures.push(`${item.path}: ${(err as Error).message}`);
    }
  }
  return { changed, failures };
}

/** Pages taken off the website, and where their old addresses now lead. */
const REMOVED_PAGES = [
  { path: 'training/masterclass-experience', to: '/training' },
  { path: 'research/innovations-lab', to: '/research' },
];

/**
 * Unpublishes the removed pages (archived, so they can be restored in Admin › Pages), points
 * redirects that led to them at their section instead, and redirects their own addresses there.
 */
async function removePages() {
  let changed = 0;
  for (const { path: pagePath, to } of REMOVED_PAGES) {
    const page = await Page.findOne({ where: { path: pagePath } });
    if (page && page.status !== 'archived') {
      log(`Unpublish page ${pagePath} (was ${page.status})`);
      if (!DRY_RUN) await page.update({ status: 'archived' });
      changed++;
    }
    for (const r of await Redirect.findAll({ where: { to_path: `/${pagePath}` } })) {
      log(`Redirect ${r.from_path}: /${pagePath} → ${to}`);
      if (!DRY_RUN) await r.update({ to_path: to });
      changed++;
    }
    if (!(await Redirect.findOne({ where: { from_path: `/${pagePath}` } }))) {
      log(`Add redirect /${pagePath} → ${to}`);
      if (!DRY_RUN) await Redirect.create({ from_path: `/${pagePath}`, to_path: to, status_code: 301, is_enabled: true, note: 'Page removed from the website (November 2026)' });
      changed++;
    }
  }
  return changed;
}

const OLD_CPD_PORTAL = 'https://cpd.carisca.org/';
const EVENTS_PORTAL = 'https://events.carisca.org/';

/** CPD registration moved from the old CPD site to the events portal. Only links still pointing at the old site change. */
async function moveCpdLinksToEventsPortal() {
  let changed = 0;
  const setting = await SiteSetting.findOne({ where: { key: 'cpd_portal_url', value: OLD_CPD_PORTAL } });
  if (setting) {
    log(`Setting cpd_portal_url: ${OLD_CPD_PORTAL} → ${EVENTS_PORTAL}`);
    if (!DRY_RUN) await setting.update({ value: EVENTS_PORTAL });
    changed++;
  }
  for (const row of await CpdProgramme.findAll({ where: { registration_url: OLD_CPD_PORTAL } })) {
    log(`CPD programme #${row.id} registration link → ${EVENTS_PORTAL}`);
    if (!DRY_RUN) await row.update({ registration_url: EVENTS_PORTAL });
    changed++;
  }
  for (const row of await CpdSession.findAll({ where: { registration_url: OLD_CPD_PORTAL } })) {
    log(`CPD session #${row.id} registration link → ${EVENTS_PORTAL}`);
    if (!DRY_RUN) await row.update({ registration_url: EVENTS_PORTAL });
    changed++;
  }
  return changed;
}

const KNUST_NAME ='Kwame Nkrumah University of Science and Technology (KNUST)';
const OLD_KNUST_LOGO = 'logo-knust 1.svg';
const NEW_KNUST_LOGO = path.join(__dirname, '..', 'seeders', 'assets', 'partner-logos', 'knust-logo.svg');

/** Swaps the low-resolution KNUST partner logo for the vector version, only while the old bundled file is in use. */
async function replaceKnustLogo() {
  const partner = await Partner.findOne({ where: { slug: slugify(KNUST_NAME) } });
  if (!partner?.logo_id) return 0;
  const current = await MediaAsset.findByPk(partner.logo_id);
  if (current?.original_name !== OLD_KNUST_LOGO) return 0;
  log(`Replace KNUST partner logo (media #${current.id}) with the vector logo`);
  if (DRY_RUN) return 1;
  const buffer = await fs.readFile(NEW_KNUST_LOGO);
  const logo = await storeUpload(
    { originalname: 'knust-logo.svg', buffer, size: buffer.length, mimetype: 'image/svg+xml', fieldname: 'file', encoding: '7bit' } as Express.Multer.File,
    { alt_text: `${KNUST_NAME} logo`, caption: null, title: KNUST_NAME, source_url: null },
  );
  await partner.update({ logo_id: logo.id });
  return 1;
}

async function main() {
  await sequelize.authenticate();
  const partnersArchived = await archivePartners();
  const covers = await attachPublicationCovers();
  const meetings = await addAsnRaMeetings();
  const summitLinks = await updateSummitLinks();
  const knustLogo = await replaceKnustLogo();
  const cpdLinks = await moveCpdLinksToEventsPortal();
  const trainingPages = await tidyTrainingPages();
  const sectionImages = await addSectionPageImages();
  const pagesRemoved = await removePages();
  console.log('Summary:', {
    partnersArchived,
    coversAttached: covers.changed,
    meetingsCreated: meetings,
    summitLinks,
    knustLogo,
    cpdLinks,
    trainingPagesTidied: trainingPages.changed,
    sectionPagesWithImages: sectionImages.changed,
    pagesRemoved,
  });
  for (const f of trainingPages.failures) console.log(`  Training page not tidied: ${f}`);
  for (const f of sectionImages.failures) console.log(`  Section page image not set: ${f}`);
  if (covers.failures.length) {
    console.log('Covers that could not be imported:');
    for (const f of covers.failures) console.log(`  - ${f}`);
  }
  if (!DRY_RUN) await revalidateFrontend(['settings', 'menus', 'cpd', 'pages', 'redirects', 'home', 'partners', 'publications', 'events', 'media', 'search', 'sitemap']);
}

main()
  .then(() => sequelize.close())
  .catch(async (err) => {
    console.error(err);
    await sequelize.close();
    process.exit(1);
  });
