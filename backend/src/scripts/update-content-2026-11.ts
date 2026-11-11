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
 */
import path from 'node:path';
import { Event, MediaAsset, Partner, Publication, sequelize } from '../models';
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

async function main() {
  await sequelize.authenticate();
  const partnersArchived = await archivePartners();
  const covers = await attachPublicationCovers();
  const meetings = await addAsnRaMeetings();
  console.log('Summary:', { partnersArchived, coversAttached: covers.changed, meetingsCreated: meetings });
  if (covers.failures.length) {
    console.log('Covers that could not be imported:');
    for (const f of covers.failures) console.log(`  - ${f}`);
  }
  if (!DRY_RUN) await revalidateFrontend(['home', 'partners', 'publications', 'events', 'media', 'search', 'sitemap']);
}

main()
  .then(() => sequelize.close())
  .catch(async (err) => {
    console.error(err);
    await sequelize.close();
    process.exit(1);
  });
