import type { Transaction } from 'sequelize';
import { PERMISSIONS, ROLE_DEFINITIONS } from '../config/permissions';
import { Category, Menu, MenuItem, Permission, Role, SiteSetting, StaffGroup } from '../models';
import { staffGroups } from './data/curated';

/** Roles & permissions are synchronised on every run so new permissions reach existing installs. */
export async function seedRolesAndPermissions(t?: Transaction) {
  for (const p of PERMISSIONS) {
    const [row] = await Permission.findOrCreate({ where: { key: p.key }, defaults: p, transaction: t });
    if (row.label !== p.label || row.group !== p.group) await row.update({ label: p.label, group: p.group }, { transaction: t });
  }
  const allPerms = await Permission.findAll({ transaction: t });
  for (const def of ROLE_DEFINITIONS) {
    const [role] = await Role.findOrCreate({
      where: { name: def.name },
      defaults: { name: def.name, label: def.label, description: def.description, is_system: true },
      transaction: t,
    });
    await role.update({ label: def.label, description: def.description, is_system: true }, { transaction: t });
    await (role as unknown as { setPermissions: (p: Permission[], o: object) => Promise<void> }).setPermissions(
      allPerms.filter((p) => def.permissions.includes(p.key)),
      { transaction: t },
    );
  }
}

type SettingSeed = {
  key: string;
  label: string;
  group: string;
  type?: 'text' | 'textarea' | 'url' | 'email' | 'boolean' | 'media';
  value: string | null;
  is_public?: boolean;
};

const SETTINGS: SettingSeed[] = [
  // Identity
  { key: 'site_name', group: 'identity', label: 'Short name', value: 'CARISCA' },
  { key: 'site_full_name', group: 'identity', label: 'Full name', value: 'Centre for Applied Research and Innovation in Supply Chain – Africa' },
  { key: 'site_tagline', group: 'identity', label: 'Tagline', value: 'Strong Supply Chains, Strong Communities' },
  {
    key: 'site_description',
    group: 'identity',
    type: 'textarea',
    label: 'Short institutional description (footer, SEO)',
    value:
      'CARISCA is a global centre of excellence at KNUST for training, generating, and translating supply chain management research and innovations into positive development outcomes for Ghana and across Africa.',
  },
  { key: 'affiliation_text', group: 'identity', label: 'Affiliation line', value: 'Kwame Nkrumah University of Science and Technology, Kumasi' },
  { key: 'support_text', group: 'identity', label: 'Supporter acknowledgement', value: 'Supported by LEARN Logistics by Kühne Foundation' },
  // Contact
  { key: 'contact_phone', group: 'contact', label: 'Phone (display)', value: '024-469-2953' },
  { key: 'contact_phone_link', group: 'contact', label: 'Phone (international, for tel: links)', value: '+233244692953' },
  { key: 'contact_email', group: 'contact', type: 'email', label: 'Email', value: 'info@carisca.knust.edu.gh' },
  {
    key: 'contact_address',
    group: 'contact',
    type: 'textarea',
    label: 'Postal / physical address',
    value: 'KNUST School of Business\nPostgraduate Block E, Second Floor\nKwame Nkrumah University of Science and Technology\nKumasi, Ghana',
  },
  {
    key: 'contact_map_url',
    group: 'contact',
    type: 'url',
    label: 'Map / directions link',
    value: 'https://www.google.com/maps/search/?api=1&query=KNUST+School+of+Business+Kumasi',
  },
  { key: 'contact_hours', group: 'contact', label: 'Office hours', value: null },
  // Social
  { key: 'social_facebook', group: 'social', type: 'url', label: 'Facebook', value: 'https://www.facebook.com/carisca.supply.chain' },
  { key: 'social_linkedin', group: 'social', type: 'url', label: 'LinkedIn', value: 'https://gh.linkedin.com/company/carisca' },
  { key: 'social_whatsapp', group: 'social', type: 'url', label: 'WhatsApp community', value: 'https://chat.whatsapp.com/CqKi3Kcdvf4EvU9nGPzGbw' },
  { key: 'social_x', group: 'social', type: 'url', label: 'X (Twitter)', value: null },
  { key: 'social_youtube', group: 'social', type: 'url', label: 'YouTube', value: null },
  // External services
  { key: 'summit_url', group: 'links', type: 'url', label: 'Current Supply Chain Research Summit website', value: 'https://summit2027.carisca.org/' },
  { key: 'summit_label', group: 'links', label: 'Summit link label', value: '2027 Summit' },
  { key: 'cpd_portal_url', group: 'links', type: 'url', label: 'CPD registration portal', value: 'https://events.carisca.org/' },
  { key: 'lmi_survey_url', group: 'links', type: 'url', label: 'Current LMI survey link', value: 'https://www.surveymonkey.com/r/Q12026LMI' },
  { key: 'lmi_survey_label', group: 'links', label: 'LMI survey label', value: 'The Logistics Managers Index Survey – 1st Quarter 2026' },
  // Homepage
  { key: 'home_intro_heading', group: 'home', label: 'Introduction heading', value: 'Centre for Applied Research and Innovation in Supply Chain – Africa' },
  {
    key: 'home_intro_text',
    group: 'home',
    type: 'textarea',
    label: 'Introduction text',
    value:
      'CARISCA’s key objective is to support higher education institutions in building the capacity necessary to provide best-in-class degree programs and training, facilitate research translation and utilization and engage stakeholders in best practices and policy changes that strengthen supply chains.',
  },
  { key: 'home_highlights_title', group: 'home', label: 'Introduction side panel title', value: 'A centre of excellence at KNUST' },
  {
    key: 'home_highlights',
    group: 'home',
    type: 'textarea',
    label: 'Introduction side panel points (one per line)',
    value:
      'Established at the Kwame Nkrumah University of Science and Technology in partnership with Arizona State University.\nSupported by LEARN Logistics by Kühne Foundation.\nFocused on improving the efficiency and effectiveness of health care and agricultural value chains across sub-Saharan Africa.',
  },
  // SEO
  { key: 'seo_default_title', group: 'seo', label: 'Default page title', value: 'CARISCA – Centre for Applied Research and Innovation in Supply Chain – Africa' },
  {
    key: 'seo_default_description',
    group: 'seo',
    type: 'textarea',
    label: 'Default meta description',
    value:
      'CARISCA at KNUST trains, generates and translates supply chain management research and innovation into development outcomes for Ghana and across Africa.',
  },
  { key: 'seo_default_og_image', group: 'seo', type: 'media', label: 'Default social sharing image (media ID)', value: null },
  // Footer
  { key: 'copyright_holder', group: 'footer', label: 'Copyright holder', value: 'CARISCA, KNUST' },
];

export async function seedSettings(t?: Transaction) {
  for (const [i, s] of SETTINGS.entries()) {
    // Never overwrite values an administrator has already edited.
    await SiteSetting.findOrCreate({
      where: { key: s.key },
      defaults: { ...s, type: s.type ?? 'text', is_public: s.is_public ?? true, sort_order: i },
      transaction: t,
    });
  }
}

export const CATEGORIES = [
  { slug: 'research', name: 'Research' },
  { slug: 'lmi', name: 'Logistics Managers Index' },
  { slug: 'training-and-cpd', name: 'Training & CPD' },
  { slug: 'summits-and-conferences', name: 'Summits & Conferences' },
  { slug: 'distinguished-lecture-series', name: 'Distinguished Lecture Series' },
  { slug: 'awards-and-scholarships', name: 'Awards & Scholarships' },
  { slug: 'partnerships', name: 'Partnerships & Stakeholders' },
  { slug: 'newsletter', name: 'Newsletter' },
  { slug: 'people', name: 'People & Profiles' },
];

export async function seedCategories(t?: Transaction) {
  for (const [i, c] of CATEGORIES.entries()) {
    await Category.findOrCreate({ where: { slug: c.slug }, defaults: { ...c, sort_order: i }, transaction: t });
  }
}

export async function seedStaffGroups(t?: Transaction) {
  for (const [i, g] of staffGroups.entries()) {
    await StaffGroup.findOrCreate({ where: { slug: g.slug }, defaults: { ...g, sort_order: i }, transaction: t });
  }
}

interface MenuSeed {
  label: string;
  url?: string;
  description?: string;
  newTab?: boolean;
  children?: MenuSeed[];
}

const MAIN_MENU: MenuSeed[] = [
  { label: 'Home', url: '/' },
  {
    label: 'About',
    url: '/about',
    description: 'Who we are, our leadership, team and partners.',
    children: [
      { label: 'About CARISCA', url: '/about' },
      { label: 'Centre Director’s Message', url: '/about/directors-message' },
      { label: 'Meet the Team', url: '/about/team' },
      { label: 'What We Do', url: '/about/what-we-do' },
      { label: 'Partners', url: '/about/partners' },
    ],
  },
  {
    label: 'Research',
    url: '/research',
    description: 'Locally relevant supply chain research, data and evidence.',
    children: [
      { label: 'Research Overview', url: '/research' },
      { label: 'Research Projects', url: '/research/projects' },
      { label: 'Publications & Resources', url: '/publications' },
      { label: 'Logistics Managers Index (LMI)', url: '/lmi' },
      { label: 'ASN-RA', url: '/asn-ra' },
      { label: 'Distinguished Lecture Series', url: '/research/distinguished-lecture-series' },
    ],
  },
  { label: 'Stakeholder Engagement', url: '/stakeholder-engagement' },
  {
    label: 'Training',
    url: '/training',
    description: 'Curricula, CPD, certifications and academic programmes.',
    children: [
      { label: 'Curricula & Training', url: '/training' },
      { label: 'CARISCA CPDs', url: '/training/cpd' },
      { label: 'ISCEA Certifications', url: '/training/iscea' },
      { label: 'Academic Programmes', url: '/training/academic-programmes' },
    ],
  },
  {
    label: 'News & Events',
    url: '/news',
    children: [
      { label: 'News & Press Releases', url: '/news' },
      { label: 'Announcements & Calls', url: '/news?type=announcement,call' },
      { label: 'Events', url: '/events' },
      { label: 'CARISCA Newsletter', url: '/newsletters' },
      { label: 'Gallery', url: '/gallery' },
    ],
  },
  { label: '2027 Summit', url: 'https://summit2027.carisca.org/', newTab: true },
  { label: 'Contact', url: '/contact' },
];

const FOOTER_MENU: MenuSeed[] = [
  {
    label: 'About',
    children: [
      { label: 'About CARISCA', url: '/about' },
      { label: 'Centre Director’s Message', url: '/about/directors-message' },
      { label: 'Meet the Team', url: '/about/team' },
      { label: 'Partners', url: '/about/partners' },
      { label: 'Contact', url: '/contact' },
    ],
  },
  {
    label: 'Research',
    children: [
      { label: 'Research Projects', url: '/research/projects' },
      { label: 'Publications & Resources', url: '/publications' },
      { label: 'Ghana LMI', url: '/lmi' },
      { label: 'ASN-RA', url: '/asn-ra' },
    ],
  },
  {
    label: 'Training & Events',
    children: [
      { label: 'CARISCA CPDs', url: '/training/cpd' },
      { label: 'ISCEA Certifications', url: '/training/iscea' },
      { label: 'Events', url: '/events' },
      { label: 'Supply Chain Research Summit', url: '/supply-chain-research-summit' },
      { label: 'Newsletter', url: '/newsletters' },
    ],
  },
];

const UTILITY_MENU: MenuSeed[] = [
  { label: 'News', url: '/news' },
  { label: 'Events', url: '/events' },
  { label: 'Newsletter', url: '/newsletters' },
  { label: 'KNUST', url: 'https://www.knust.edu.gh/', newTab: true },
];

async function seedMenu(key: string, name: string, items: MenuSeed[], t?: Transaction) {
  const [menu, created] = await Menu.findOrCreate({ where: { key }, defaults: { key, name }, transaction: t });
  if (!created && (await MenuItem.count({ where: { menu_id: menu.id }, transaction: t }))) return; // keep admin edits
  const insert = async (list: MenuSeed[], parentId: number | null) => {
    for (const [i, item] of list.entries()) {
      const row = await MenuItem.create(
        {
          menu_id: menu.id,
          parent_id: parentId,
          label: item.label,
          url: item.url ?? null,
          description: item.description ?? null,
          open_in_new_tab: Boolean(item.newTab),
          sort_order: i,
        },
        { transaction: t },
      );
      await insert(item.children ?? [], row.id);
    }
  };
  await insert(items, null);
}

export async function seedMenus(t?: Transaction) {
  await seedMenu('main', 'Main navigation', MAIN_MENU, t);
  await seedMenu('footer', 'Footer links', FOOTER_MENU, t);
  await seedMenu('utility', 'Top utility bar', UTILITY_MENU, t);
}
