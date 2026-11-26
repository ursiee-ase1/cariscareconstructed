/**
 * Core CMS pages. Body text is transcribed from the existing CARISCA website; formatting has been
 * cleaned up but wording is preserved. Pages are editable in the dashboard after seeding.
 */
import { isceaProgrammes } from './curated';

export interface PageSeed {
  path: string;
  title: string;
  summary?: string;
  body: string;
  template?: 'standard' | 'wide' | 'landing';
  parent?: string;
  sort_order?: number;
  status?: 'published' | 'draft';
  review?: string;
  legacy_url?: string;
  hero_source?: string;
}

const KEY_OBJECTIVE =
  'CARISCA’s key objective is to support higher education institutions in building the capacity necessary to provide best-in-class degree programs and training, facilitate research translation and utilization and engage stakeholders in best practices and policy changes that strengthen supply chains.';

export const pages: PageSeed[] = [
  {
    path: 'about',
    title: 'About CARISCA',
    summary:
      'A global centre of excellence for training, generating, and translating supply chain management research and innovations into positive development outcomes for Ghana and across Africa.',
    legacy_url: 'https://carisca.knust.edu.gh/about-us/about-us/',
    hero_source: 'https://carisca.knust.edu.gh/wp-content/uploads/2020/08/happy-farm-girl.jpg',
    body: `
<p>The Centre for Applied Research and Innovation in Supply Chain – Africa (CARISCA) is a global centre of excellence for training, generating, and translating supply chain management research and innovations into positive development outcomes for Ghana and across Africa. The centre is supported by LEARN Logistics by Kühne Foundation.</p>
<p>CARISCA leverages a local and international network of governmental, civil society, and industry partners to connect African researchers, practitioners, and businesses to supply chain assets around the world. CARISCA seeks to strengthen local capacity to improve supply chains by increasing efficiency, effectiveness, and inclusiveness, driving country self-reliance.</p>
<h2>Key objective</h2>
<p>${KEY_OBJECTIVE}</p>
<h2>CARISCA seeks to</h2>
<ul>
<li>Establish KNUST as Africa’s preeminent source of supply chain management expertise.</li>
<li>Create a resource for researchers in Ghana and across Africa to drive innovative research, translation, and training to improve African supply chains, sustained by revenue-generating activities and a robust partner network.</li>
<li>Significantly improve the efficiency and effectiveness of health care and agricultural value chains.</li>
</ul>
<h2>Our focus areas</h2>
<ul>
<li><a href="/research">Research</a></li>
<li><a href="/stakeholder-engagement">Stakeholder Engagement</a></li>
<li><a href="/training">Curricula &amp; Training</a></li>
</ul>`,
  },
  {
    path: 'about/directors-message',
    parent: 'about',
    sort_order: 1,
    title: 'Centre Director’s Message',
    summary: 'A welcome from Prof. Nathaniel Boso, Centre Director.',
    legacy_url: 'https://carisca.knust.edu.gh/about-us/centre-driectors-message/',
    hero_source: 'https://carisca.knust.edu.gh/wp-content/uploads/2020/08/Prof-Nathaniel-Boso_2.jpg',
    review:
      'The message states CARISCA is "the only center of excellence in West Africa to hold the twin global professional accreditation for CIPS and CILT". Confirm this accreditation claim is current before relying on it.',
    body: `
<h2>Welcome from the CARISCA Centre Director</h2>
<p>I warmly welcome you to the Centre for Applied Research and Innovation in Supply Chain – Africa (CARISCA), where great minds take on significant development challenges in supply chains. CARISCA is an interdisciplinary centre of excellence established at the Kwame Nkrumah University of Science and Technology (KNUST) in partnership with Arizona State University (ASU). The centre is envisioned as a globally recognized, locally owned hub for generating and translating innovative research into positive development outcomes for Ghanaian and pan-African supply chains.</p>
<p>The Centre is harnessing innovative research in supply chain management, drawing on the social sciences, industrial and systems engineering, computer science, mathematics, economics, marketing, finance, and management, to take on significant development challenges and address barriers to development caused by inefficient and ineffective supply chains. The centre’s focus on supply chain management and innovation reflects a large body of research showing that efficient local supply chains are crucial to local, regional, and national economic development.</p>
<p>The CARISCA Centre is positioned to be Africa’s preeminent source of supply chain management expertise. It is a resource for researchers across Africa to drive innovative research, research translation (applying research findings to policy, practice, or additional research), and training to improve African supply chains, sustained by revenue-generating activities and a robust partner network. The Centre focuses on significantly improving the efficiency and effectiveness of health care and agricultural value chains across sub-Saharan Africa.</p>
<p>We are partnering with international, regional and national research institutions to lead cutting-edge research in supply chains that publishes in some of the most prestigious international scholarly journals, and that provides insights for supply chain practitioners and policymakers. We are also collaborating with networks of industry leaders, policymakers and trade associations to connect African researchers, practitioners, and businesses to global supply chain assets. We have the most diverse and internationally recognized academic programs in the supply chain, procurement, logistics, and transportation management in the West African sub-region. We are the only center of excellence in West Africa to hold the twin global professional accreditation for the Chartered Institution of Procurement and Supply (CIPS) and Chartered Institute of Logistics &amp; Transport (CILT), making us one of the very few accredited study centers to train supply chain professionals in the sub-region.</p>
<p>CARISCA is your globally connected partner for supply chain research, training, and policy. We provide a one-stop-shop for research capacity development, internationally accredited academic programs, and C-suite executive and professional training programs in supply chain management.</p>
<p>We are committed to collaborating with you to advance your supply chain research, executive training, and policy development needs.</p>
<p>Welcome aboard!</p>
<p><strong>Nathaniel Boso, PhD</strong><br>Centre Director</p>`,
  },
  {
    path: 'about/mission-and-vision',
    parent: 'about',
    sort_order: 2,
    status: 'draft',
    title: 'Mission and Vision',
    summary: 'Transforming Supply Chains to Bring Change in Africa.',
    legacy_url: 'https://carisca.knust.edu.gh/about-us/mission-and-vision/',
    review: 'The legacy page contains only the slogan. Supply the approved mission and vision statements before publishing.',
    body: '<p><strong>Transforming Supply Chains to Bring Change in Africa</strong></p>',
  },
  {
    path: 'about/what-we-do',
    parent: 'about',
    sort_order: 3,
    title: 'What We Do',
    summary: 'CARISCA’s work is organised in three components: research, stakeholder engagement, and curricula and training.',
    legacy_url: 'https://carisca.knust.edu.gh/what-we-do/',
    body: `
<p>CARISCA divides its activities into components, namely research, stakeholder engagement and curriculum. These components push CARISCA closer to its aim to increase research capacity, strengthen and update supply chain curricula, and provide supply chain management expertise to Ghana and Africa.</p>
<p>These activities also focus on developing partnerships and revenue-generating activities to sustain ongoing growth and influence in supply chain education, research and practice.</p>
<h2>Component 1: Research</h2>
<p>The goal for this component is to strengthen African higher education institutions’ capacity for and adoption of innovative, locally relevant research. <a href="/research">Read more</a></p>
<h2>Component 2: Stakeholder Engagement</h2>
<p>The goal of this component is to create a strong network by engaging policymakers, the private sector, and civil society organizations in supply chain research, education, and knowledge transfer. <a href="/stakeholder-engagement">Read more</a></p>
<h2>Component 3: Curricula &amp; Training</h2>
<p>The goal of this component is to develop relevant evidence-based training opportunities to benefit students and supply chain management practitioners in Ghana and beyond. <a href="/training">Read more</a></p>`,
  },
  {
    path: 'research',
    title: 'Research',
    summary: 'Strengthening African higher education institution capacity for, and adoption of, innovative, locally relevant research.',
    legacy_url: 'https://carisca.knust.edu.gh/component-1-research/',
    template: 'wide',
    body: `
<h2>Component 1 – Research</h2>
<p><strong>Goal:</strong> Strengthen African higher education institution capacity for and adoption of innovative, locally relevant research.</p>
<p>CARISCA will provide technical assistance to strengthen KNUST’s capacity to apply global best practices for development-relevant research in emergent supply chain management (SCM) research topics with applications to health, agriculture, and other sectors.</p>
<p>In addition to foundational topics, CARISCA will explore possibilities for integrating emerging research approaches such as artificial intelligence (AI) and machine learning; blockchain; simulations for teaching and decision making; Internet of Things for tracking; localization of SCM in emerging markets; and low-infrastructure solutions.</p>
<p>We will draw upon local faculty experts to adapt and integrate relevant research topics based on in-country and pan-African needs.</p>`,
  },
  {
    path: 'stakeholder-engagement',
    title: 'Stakeholder Engagement',
    summary:
      'Creating a strong network by engaging policymakers, the private sector, and civil society organisations in supply chain research, education, and knowledge transfer.',
    legacy_url: 'https://carisca.knust.edu.gh/component-2-stakeholder-engagement/',
    hero_source: 'https://carisca.knust.edu.gh/wp-content/uploads/2023/07/MG_9974-scaled.jpg',
    template: 'wide',
    body: `
<h2>Component 2 – Stakeholder Engagement</h2>
<p><strong>Goal:</strong> Create a strong network by engaging policymakers, the private sector, and civil society organizations in supply chain research, education, and knowledge transfer.</p>
<p>CARISCA will translate research into development impacts by convening and fostering collaboration among private sector partners, higher education institutions, government agencies, non-profit organizations, professional societies and civil society organizations to apply supply chain research to development challenges.</p>
<p>CARISCA will engage a broad base of external Ghanaian and African stakeholders to identify pathways for applying research to shape local policy and meet in-field needs.</p>`,
  },
  {
    path: 'training',
    title: 'Curricula & Training',
    summary:
      'Developing relevant evidence-based training opportunities to benefit students and supply chain management practitioners in Ghana and beyond.',
    legacy_url: 'https://carisca.knust.edu.gh/curricula-training/',
    template: 'wide',
    body: `
<h2>Component 3 – Curricula and Training</h2>
<p><strong>Goal:</strong> Develop relevant evidence-based training opportunities to benefit students and supply chain management practitioners in Ghana and beyond.</p>
<p>Quality supply chain management education is critical to creating strong supply chains. Education opportunities are limited across Africa. There are few training opportunities for in-field/in-service training in Ghana, including government workers who need to meet Ghana’s Public Procurement Authority (PPA) certification and Continuing Professional Development (CPD) requirements.</p>
<p>Drawing upon ASU’s expertise in supply chain management and innovative locally relevant research, CARISCA will develop sustainable mechanisms to reach diverse learners through conventional academic programs, CPD, and digital/mobile-enabled training.</p>`,
  },
  {
    path: 'training/iscea',
    parent: 'training',
    sort_order: 3,
    title: 'ISCEA Certifications',
    summary:
      'Globally recognised supply chain certification programmes offered through a partnership between CARISCA and the International Supply Chain Education Alliance (ISCEA).',
    legacy_url: 'https://carisca.knust.edu.gh/international-certified-supply-chain-education-alliance-iscea/',
    hero_source: 'https://carisca.knust.edu.gh/wp-content/uploads/2026/03/ISCEA.png',
    template: 'wide',
    review: 'Confirm that the 75% discount and programme fees are still current.',
    body: `
<h2>Advance your career with globally recognised certification programmes</h2>
<p>Offered through a partnership between CARISCA and the International Supply Chain Education Alliance (ISCEA).</p>
<h3>Special discount through CARISCA</h3>
<p>Ghanaian professionals who register through CARISCA can receive up to 75% discount on ISCEA certification programmes.</p>
<h2>Available certification programmes</h2>
${isceaProgrammes
  .map(
    (p) =>
      `<h3>${p.name} (${p.code})</h3><p>${p.description}</p><p><strong>Cost:</strong> ${p.cost} · <a href="${p.brochure}">Download brochure (PDF)</a></p>`,
  )
  .join('\n')}
<h2>Why take these certifications?</h2>
<ul><li>Internationally recognised credentials</li><li>Enhance your supply chain career prospects</li><li>Gain practical, industry-relevant skills</li><li>Learn from global supply chain experts</li><li>Strengthen professional credibility</li></ul>
<h2>Ideal for</h2>
<ul><li>Supply chain and procurement professionals</li><li>Logistics and transport managers</li><li>Operations managers</li><li>Healthcare supply chain professionals</li><li>Early-career professionals and analysts</li></ul>
<h2>How the programme works</h2>
<ol><li>ISCEA will provide individual access to the online training platform at <a href="https://www.isceaonline.com/">isceaonline.com</a>.</li><li>Upon completion of the course, learners receive exam details and remote proctoring arrangements.</li><li>Learners who pass the exam with 70% or higher receive an electronic certificate.</li><li>Learners who do not pass can retake the exam once at no additional cost.</li></ol>
<h2>About ISCEA</h2>
<p>ISCEA’s mission is to provide total supply chain knowledge to manufacturing and service industry professionals through Education, Certification and Recognition.</p>
<p>ISCEA is the developer of internationally recognized certification programs including Certified Supply Chain Manager (CSCM), Certified Supply Chain Analyst (CSCA), Certified Lean Master (CLM), Certified Supply Chain Technology Professional (CSCTP), Certified Demand Driven Planner (CDDP) and others. ISCEA is also the governing body for the ISCEA Prize (formerly the Ptak Prize).</p>`,
  },
  {
    path: 'asn-ra',
    title: 'Africa Supply Network Research Accelerator (ASN-RA)',
    summary:
      'Inspired by Arizona State University’s Complex Adaptive Supply Networks Research Accelerator, ASN-RA brings together emerging scholars from across Africa to catalyse collaborative research in supply networks.',
    legacy_url: 'https://carisca.knust.edu.gh/asn-ra/',
    template: 'wide',
    review:
      'The page states participants came from "seven African countries" (listing Ghana, Nigeria, Kenya, Egypt, Ethiopia, South Africa and Uganda), but the member list also includes Tanzania. Confirm.',
    body: `
<h2>About ASN-RA</h2>
<p>The Africa Supply Network Research Accelerator (ASN-RA) is inspired by Arizona State University’s Complex Adaptive Supply Networks Research Accelerator (CASN-RA) model. Designed to catalyze innovative and collaborative research in supply networks, ASN-RA brings together emerging scholars from across Africa.</p>
<p>In its inaugural edition, 21 researchers from seven African countries, namely Ghana, Nigeria, Kenya, Egypt, Ethiopia, South Africa, and Uganda, were selected to participate. The meeting led to forming five research teams, each working on projects aimed at publication in top-tier, peer-reviewed journals.</p>
<p>ASN-RA is a significant milestone for CARISCA. It advances our mission to:</p>
<ul><li>Strengthen research capacity for Africa’s next generation of supply chain scholars</li><li>Facilitate access to cutting-edge methodologies and global academic networks</li><li>Foster long-term research partnerships across the continent and beyond</li></ul>
<p>The ASN-RA meeting is held biennially, rotating among partner institutions across Africa, to ensure broader regional inclusion and deepen collaborative ties.</p>
<p>This initiative reflects CARISCA’s commitment to supporting homegrown research excellence and empowering African scholars to shape and share the continent’s supply chain narrative from an African perspective.</p>
<h2>Members</h2>
<table><thead><tr><th scope="col">Name</th><th scope="col">University</th><th scope="col">Country</th></tr></thead><tbody>
<tr><td>Mohammed Suleiman</td><td>Mzumbe University</td><td>Tanzania</td></tr>
<tr><td>Robert Kalema</td><td>Makerere University Business School</td><td>Uganda</td></tr>
<tr><td>Matthew Kalubanga</td><td>Makerere University Business School</td><td>Uganda</td></tr>
<tr><td>Joseph Onyango</td><td>Strathmore University</td><td>Kenya</td></tr>
<tr><td>Barima Okyere Anim</td><td>KNUST</td><td>Ghana</td></tr>
<tr><td>Benjamin Agyei-Owusu</td><td>KNUST</td><td>Ghana</td></tr>
<tr><td>Kelvinne Mocke</td><td>University of Pretoria</td><td>South Africa</td></tr>
<tr><td>Caleb Amankwaa Kumi</td><td>KNUST</td><td>Ghana</td></tr>
<tr><td>Felix Mogesa</td><td>Strathmore University</td><td>Kenya</td></tr>
<tr><td>Priscilla Asamany</td><td>KNUST</td><td>Ghana</td></tr>
<tr><td>Busha Kitessa</td><td>Addis Ababa University</td><td>Ethiopia</td></tr>
<tr><td>Usman Abbas</td><td>Kaduna State University</td><td>Nigeria</td></tr>
<tr><td>Esther Nandara</td><td>GIMPA</td><td>Ghana</td></tr>
<tr><td>Mary Aminga</td><td>Strathmore University</td><td>Kenya</td></tr>
<tr><td>Ishmael Acquah</td><td>KNUST</td><td>Ghana</td></tr>
<tr><td>Henry Mutebi</td><td>Makerere University Business School</td><td>Uganda</td></tr>
<tr><td>Mona Ali</td><td>German University of Cairo</td><td>Egypt</td></tr>
<tr><td>Bonny Bagenda</td><td>Makerere University Business School</td><td>Uganda</td></tr>
<tr><td>Alfred Sallwa</td><td>Mzumbe University</td><td>Tanzania</td></tr>
<tr><td>Assilah Agigi</td><td>University of Pretoria</td><td>South Africa</td></tr>
<tr><td>Mavis Agbodza</td><td>University of Education, Winneba</td><td>Ghana</td></tr>
</tbody></table>
<h2>Current projects</h2>
<p>See the ASN-RA projects in <a href="/research/projects">Research Projects</a>.</p>
<h2>Got questions?</h2>
<p>Contact Prof. Adegoke Oke: <a href="mailto:adegoke.Oke@asu.edu">adegoke.Oke@asu.edu</a></p>`,
  },
  {
    path: 'lmi',
    title: 'Logistics Managers Index (LMI)',
    summary: 'The Ghana Logistics Managers Index — the first of its kind in Africa.',
    legacy_url: 'https://carisca.knust.edu.gh/lmi/',
    hero_source: 'https://carisca.knust.edu.gh/wp-content/uploads/2023/05/Copy-of-Ghana-LMI-Email-Header-1024-×-1024px.png',
    body: `
<h2>What is the Logistics Managers Index?</h2>
<p>Supply chain managers need good data and information to ensure that vital goods are in stock. To support these decision-makers, CARISCA created the Logistics Managers Index (LMI) for Ghana. CARISCA released its first LMI report in June 2022. The calculated LMI for Ghana, along with the accompanying analysis of its components, provide useful insights for the government of Ghana, business decision-makers, market analysts, and investors, as it offers a predictive indicator of overall economic activity in Ghana.</p>
<p>The Ghana LMI is the first of its kind in Africa, and a significant step toward supply chain efficiency, visibility and transparency in Ghana. A reading above 50 indicates growth in logistics activity; below 50 indicates contraction.</p>
<p>The LMI report is published quarterly. Senior executives and managers of Ghanaian organisations are invited to participate in the quarterly LMI surveys.</p>`,
  },
  {
    path: 'contact',
    title: 'Contact Us',
    summary: 'Get in touch with the CARISCA team.',
    template: 'landing',
    body: '<p>We welcome enquiries about our research, training and CPD programmes, partnerships, and media requests. Use the form, or reach us directly using the details on this page.</p>',
  },
];

/** Legacy WordPress pages imported as-is (sanitised) by the importer, with their new paths. */
export const legacyPages: Array<{ wpPath: string; path: string; title?: string; parent?: string; status: 'published' | 'draft' }> = [
  { wpPath: 'what-we-do/industry-engagement', path: 'stakeholder-engagement/industry-engagement', parent: 'stakeholder-engagement', status: 'published' },
  { wpPath: 'industry/consultancy-services', path: 'stakeholder-engagement/consultancy-services', parent: 'stakeholder-engagement', status: 'draft' },
  { wpPath: 'industry/supply-chain-action-laboratory-engagement-scale', path: 'stakeholder-engagement/supply-chain-action-network', title: 'Supply Chain Action Network (SCAN)', parent: 'stakeholder-engagement', status: 'published' },
  { wpPath: 'what-we-do/research-capacity-development', path: 'research/research-capacity-development', parent: 'research', status: 'published' },
  { wpPath: 'distinguished-lecture-series', path: 'research/distinguished-lecture-series', parent: 'research', status: 'published' },
  // Removed from the website in November 2026 (kept as a draft).
  { wpPath: 'innovations', path: 'research/innovations-lab', title: 'CARISCA Innovations Lab', parent: 'research', status: 'draft' },
  { wpPath: 'carisca-dissertation-awards', path: 'research/dissertation-awards', parent: 'research', status: 'published' },
  { wpPath: 'scholarship', path: 'training/scholarships', parent: 'training', status: 'published' },
  { wpPath: 'what-we-do/professional-training-and-education', path: 'training/professional-training-and-education', parent: 'training', status: 'published' },
  { wpPath: 'new-supply-chain-graduate-programmes', path: 'training/academic-programmes', title: 'Academic Programmes', parent: 'training', status: 'published' },
  { wpPath: 'bachelor-of-science-bsc-in-logistics-and-supply-chain-management', path: 'training/academic-programmes/bsc-logistics-and-supply-chain-management', parent: 'training/academic-programmes', status: 'published' },
  { wpPath: 'master-of-science-msc-philosophy-m-phil-logistics-and-supply-chain-management', path: 'training/academic-programmes/msc-mphil-logistics-and-supply-chain-management', parent: 'training/academic-programmes', status: 'published' },
  { wpPath: 'master-of-science-msc-procurement-and-supply-chain-management', path: 'training/academic-programmes/msc-procurement-and-supply-chain-management', parent: 'training/academic-programmes', status: 'published' },
  // Removed from the website in November 2026 (kept as a draft).
  { wpPath: 'training/cpd/masterclass-experience', path: 'training/masterclass-experience', parent: 'training', status: 'draft' },
  { wpPath: 'supply-chain-research-summit', path: 'supply-chain-research-summit', title: 'Supply Chain Research Summit', status: 'published' },
  { wpPath: '2026-supply-chain-research-summit', path: 'supply-chain-research-summit/2026', title: '2026 Supply Chain Research Summit', parent: 'supply-chain-research-summit', status: 'published' },
  { wpPath: '2025-supply-chain-research-summit', path: 'supply-chain-research-summit/2025', parent: 'supply-chain-research-summit', status: 'published' },
  { wpPath: '2023-supply-chain-research-summit', path: 'supply-chain-research-summit/2023', parent: 'supply-chain-research-summit', status: 'published' },
  { wpPath: 'carisca-2022-supply-chain-research-summit', path: 'supply-chain-research-summit/2022', parent: 'supply-chain-research-summit', status: 'published' },
  { wpPath: '2024businessforum', path: 'supply-chain-business-forum-2024', status: 'published' },
  { wpPath: 'cariscaprogrammes', path: 'training/call-for-facilitators', title: 'Call for Facilitators', parent: 'training', status: 'draft' },
  { wpPath: 'about-us/management', path: 'about/management', parent: 'about', status: 'draft' },
  { wpPath: 'research-faculty', path: 'about/research-faculty', parent: 'about', status: 'draft' },
  { wpPath: 'news-events/news-press-releases/gallery', path: 'about/gallery-legacy', status: 'draft' },
];
