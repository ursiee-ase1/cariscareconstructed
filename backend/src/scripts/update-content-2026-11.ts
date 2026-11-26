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
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { CpdProgramme, CpdSession, Event, MediaAsset, MenuItem, Partner, Publication, SiteSetting, sequelize } from '../models';
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

async function downloadImage(url: string, alt: string) {
  if (new URL(url).host !== LEGACY_HOST) throw new Error(`Refusing to download from ${url}`);
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
  console.log('Summary:', { partnersArchived, coversAttached: covers.changed, meetingsCreated: meetings, summitLinks, knustLogo, cpdLinks });
  if (covers.failures.length) {
    console.log('Covers that could not be imported:');
    for (const f of covers.failures) console.log(`  - ${f}`);
  }
  if (!DRY_RUN) await revalidateFrontend(['settings', 'menus', 'cpd', 'home', 'partners', 'publications', 'events', 'media', 'search', 'sitemap']);
}

main()
  .then(() => sequelize.close())
  .catch(async (err) => {
    console.error(err);
    await sequelize.close();
    process.exit(1);
  });
