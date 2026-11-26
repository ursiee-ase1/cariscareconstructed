/**
 * Tidied versions of the Training pages imported from the legacy WordPress site. The wording is the
 * original's; only the structure changed: real headings instead of page-builder text, duplicated
 * blocks removed (the old site rendered some sections twice, once for desktop and once for
 * mobile), broken links fixed, and photos grouped so they can be laid out as galleries.
 *
 * `legacy:` image sources are downloaded from the legacy site into the media library and replaced
 * with the library URL when the content is applied (scripts/update-content-2026-11.ts).
 *
 * `importedSha256` is the hash of the body as imported. A page is only replaced while its body is
 * still exactly that, so nothing edited in the dashboard is ever overwritten.
 */
export interface TrainingPageUpdate {
  path: string;
  importedSha256: string;
  /** Earlier tidied versions written by this update, which may also be replaced. */
  replacesSha256?: string[];
  body: string;
  /** Hero image for the page title band, when the page has none. */
  hero?: { legacy?: string; existingFile?: string; alt: string };
}

const KNUST_ADMISSIONS = 'https://apps.knust.edu.gh/admissions/';
const KNUST_ANNOUNCEMENT = 'https://www.knust.edu.gh/announcements/general/admission-candidates-research-or-higher-degree-programmes-20252026-academic-year';
const WP = 'https://carisca.knust.edu.gh/wp-content/uploads';

export const trainingPageUpdates: TrainingPageUpdate[] = [
  {
    path: 'training/academic-programmes',
    importedSha256: '069c01d547482913654f608f02a9c7e0ad4565125f18cf1d9597e0d294c38ae5',
    hero: { existingFile: 'whatsapp-image-2023-11-27-at-10-24-54-2a07514d.jpeg', alt: 'CARISCA scholarship graduates at KNUST' },
    body: `<h2>New Supply Chain Graduate Programmes</h2>
<p>Are you involved in the health or agriculture sector and interested in learning Supply Chain Management? If yes, this is for you!</p>
<p>The Department of Supply Chain and Information Systems, KNUST School of Business and the Centre for Applied Research and Innovation in Supply Chain-Africa (CARISCA) introduce 18-month duration MSc programmes in the following specialisations:</p>
<h2>Programmes</h2>
<h3>MSc Pharmaceutical Supply Chain Management</h3>
<p><img src="legacy:${WP}/2024/05/national-cancer-institute-L8tWZT4CcVQ-unsplash-scaled.jpg" alt="" /></p>
<p>The MSc Pharmaceutical Supply Chain program is designed to address healthcare delivery challenges, particularly in African countries like Ghana. The program focuses on overcoming obstacles like poor supply chain management, logistical challenges, inadequate storage facilities, and poor financial planning, which contribute to chronic stock-outs.</p>
<h3>MSc Agricultural Supply Chain Management</h3>
<p><img src="legacy:${WP}/2024/05/megan-thomas-xMh_ww8HN_Q-unsplash.jpg" alt="" /></p>
<p>The MSc Agricultural Supply Chain Management degree program has been designed to provide prospective students and supply chain professionals with the knowledge to tackle challenges in the agricultural supply chains in Ghana, Africa, and other developing regions and create more effective and efficient agricultural supply chains.</p>
<h3>MSc Health Supply Chain Management</h3>
<p><img src="legacy:${WP}/2024/05/hush-naidoo-jade-photography-yo01Z-9HQAw-unsplash-scaled.jpg" alt="" /></p>
<p>The MSc Health Supply Chain program aims to address challenges in the health sector by providing students with healthcare logistics and supply chain management skills. Graduates will be equipped to manage healthcare supply chains, ensuring sustainable and uninterrupted access to affordable and quality health commodities and services.</p>
<h2>Entry Requirements</h2>
<ul>
<li>Candidates must have a bachelor’s degree qualification with second class lower division in relevant disciplinary areas: Pharmacy, Healthcare related programs, Health Administration, Agriculture/Agribusiness, Business Administration.</li>
<li>Preference will be given to applicants with first and second (upper) class qualifications in relevant disciplinary areas.</li>
<li>Enthusiasm for cutting-edge research, team spirit, and capability of independent problem-solving.</li>
<li>Proficiency in English (oral and written).</li>
<li>Excellent communication and leadership skills.</li>
</ul>
<h2>What you need</h2>
<p>Interested candidates should apply through the <a href="${KNUST_ADMISSIONS}">KNUST admissions portal</a> with the following:</p>
<ul>
<li>Detailed Curriculum Vitae (CV)</li>
<li>Official Academic transcript</li>
<li>Two letters of reference (one from a supervisor at the diploma level) for BSc applicants and</li>
<li>Two letters of reference (one from a supervisor at the bachelor’s level) for MSc applicants</li>
<li>Completed application form with Two passport photographs</li>
<li>Certificates for Diploma and BSc degree</li>
</ul>
<h2>Application</h2>
<ol>
<li>Prospective applicants should purchase an e-Voucher containing Login ID/Serial Number and PIN for <strong>GHȼ350.00</strong> online via the admissions portal or dial <strong>*415*55#</strong>. Follow the prompts to purchase an E-Voucher via mobile money (All Networks).</li>
<li>Candidates should then proceed to the <a href="${KNUST_ADMISSIONS}">online admissions portal</a> and begin the application process.</li>
<li>The deadline for the sale of forms and completion of online application is <strong>October 31, 2025.</strong></li>
<li>Application forms submitted after the deadline shall not be processed. Only candidates who successfully gain admission shall be notified subsequently.</li>
</ol>
<p><strong>NB:</strong> All International Applicants are to generate <strong>Login ID/Serial Number</strong> and <strong>PIN</strong> for the online application via the <a href="https://apps.knust.edu.gh/admissions/apply/Account/Register">international applicants’ registration page</a>.</p>
<p><a href="${KNUST_ANNOUNCEMENT}">Apply Now</a></p>`,
  },
  {
    path: 'training/professional-training-and-education',
    importedSha256: 'b65868a919b8945db7fb634d32b1c4a44e7463c7f6984134a01ea3d568eba804',
    hero: { legacy: `${WP}/2021/09/Christa-scaled.jpg`, alt: 'A participant working at a laptop during CARISCA training' },
    body: `<h2>What we offer</h2>
<p>For Professionals who do not have the ability or need to engage in full CPD training, CARISCA will provide training through a digital/mobile training platform that offers flexible, asynchronous training. CARISCA seeks to significantly improve the efficiency and effectiveness of health and agricultural supply chains. Through this, CARISCA will establish Professional Training and Education for both Healthcare Workers and Government workers in Procurement and Supply Chain Management.</p>
<p><img src="legacy:${WP}/2021/09/Henry-1-scaled.jpg" alt="" /><img src="https://pub-900dc15efa6e4f0c84879fe16336a7b1.r2.dev/uploads/2026/10/training-2162e082.jpg" alt="" /><img src="legacy:${WP}/2020/10/group-Copy.jpg" alt="" /></p>
<h2>Who can partake?</h2>
<h3>Healthcare Workers</h3>
<p>Curriculum for healthcare workers includes, warehouse and inventory management and quality control/assurance; in agriculture, training will address supply chain visibility, warehouse/storage management, transportation management, and negotiation and contracting.</p>
<h3>Government workers in Procurement and Supply</h3>
<p>For government workers in procurement and supply (such as procurement and supply officers, contract administrators, warehouse managers, and purchasing administrators), our developed curriculum is based on GoG-required skills for procurement and supply officers, including e-procurement, supply chain digitalisation, procurement and supply chain analytics, and other topics based on GoG demand.</p>`,
  },
  {
    path: 'training/scholarships',
    importedSha256: '24643edd132f7ddaf0ffea9ef809f0106ef6e7ea1b0621b2cd14b64ebb22683d',
    // First tidied version (photo placed under "Got Questions?"); superseded by this one.
    replacesSha256: ['93faada7709a0ad8b7a5b407c6e7d3ada98b0923062c932587439235887fc025'],
    body: `<h2>CARISCA Scholarship Awards</h2>
<p><strong>Earn a full or partial scholarship</strong></p>
<p>The Centre for Applied Research and Innovation in Supply Chain- Africa’s vision is to create a center of excellence at KNUST that can transform supply chain networks to improve the quality of life of people in Ghana and across Africa.</p>
<p>Earn a full or partial scholarship to pursue graduate studies in logistics, procurement, supply chain management or business and management at KNUST. Ghana needs your ideas and perspectives to fuel future supply chain management innovation and practice.</p>
<p>These scholarships form a part of CARISCA’s strategy to broaden the accessibility of Ghana’s higher education system, aiming to incorporate fresh ideas and diverse perspectives crucial for propelling future innovations and practices in supply chain management.</p>
<p><img src="https://pub-900dc15efa6e4f0c84879fe16336a7b1.r2.dev/uploads/2026/10/whatsapp-image-2023-11-27-at-10-24-54-2a07514d.jpeg" alt="CARISCA scholarship graduates at KNUST" /></p>
<h2>Programmes Covered by the Scholarship</h2>
<ul>
<li>MSc Pharmaceutical Supply Chain Management</li>
<li>MSc Agricultural Supply Chain Management</li>
<li>MSc Health Supply Chain Management</li>
<li>MSc Logistics and Supply Chain Management</li>
<li>MSc Procurement and Supply Chain Management</li>
<li>MPhil Procurement and Supply Chain Management</li>
<li>MPhil Logistics and Supply Chain Management</li>
</ul>
<h2>Frequently Asked Questions</h2>
<p>Supply Chain Graduate Scholarships: what you need to know before you apply for the Scholarship Program. <a href="/news/call-for-applications">Read more</a></p>
<h3>What kind of Scholarship does CARISCA offer?</h3>
<p>CARISCA offers either partial or full scholarships to successful applicants.</p>
<p><strong>Full Scholarship covers:</strong></p>
<ol>
<li>Tuition fees and other charges waiver</li>
<li>Monthly stipend</li>
<li>Hostel accommodation</li>
<li>Research grants (fieldwork, data analysis, etc.)</li>
</ol>
<p><strong>Partial Scholarship covers:</strong></p>
<ol>
<li>Tuition fees and other charges waiver</li>
<li>Hostel accommodation</li>
<li>Research grants (fieldwork, data analysis, etc.)</li>
</ol>
<p><strong>Tuition waiver scholarship</strong></p>
<ol>
<li>Tuition fees and other charges waiver</li>
<li>Research grants (fieldwork, data analysis, etc.)</li>
</ol>
<h3>What are the requirements for this scholarship?</h3>
<p>In conformity with the entry requirement at KNUST, successful candidates must have the following qualifications:</p>
<ol>
<li>Bachelor’s degree with first-class or second-class (upper-division) honours in Business Administration, Economics, Social Sciences, Agriculture, Pharmacy, Health or related disciplines</li>
<li>An internationally recognized Certificate of Proficiency in the English Language (e.g., TOEFL or IELTS) with an above-average score is required for applicants whose bachelor’s degree is not in English</li>
</ol>
<h3>What do I need to attach to my application?</h3>
<ol>
<li>Completed scholarship application form</li>
<li>Curriculum vitae (two pages maximum)</li>
<li>Two reference letters from previous academic institutions</li>
<li>Proof of English proficiency (only for applicants whose bachelor’s degree was not in English)</li>
<li>Official transcripts for bachelor’s degree</li>
<li>Certified copies of official bachelor’s degree certificate</li>
<li>Soft copy of a letter of motivation (max. one page) with the heading “CARISCA Scholarship Award” outlining answers to the following:
<ol>
<li>Why are you interested in supply chain management?</li>
<li>What experiences do you have that prepare you for research in supply chain management?</li>
<li>Why do you need financial support to successfully complete a master’s degree programme?</li>
<li>How will admission into this programme fit into your professional goals?</li>
<li>How will your community benefit from your training on this programme?</li>
<li>You may include other relevant information and/or experience that support your application.</li>
</ol>
</li>
</ol>
<h3>Can I apply for a scholarship before being accepted into KNUST?</h3>
<p>Applicants for the CARISCA scholarship must be successfully admitted into the Kwame Nkrumah University of Science and Technology as of the time of application.</p>
<h3>How do I know there is a scholarship opportunity and how do I apply?</h3>
<p>CARISCA offers a number of scholarships every year. Visit the website to find out when applications are opened.</p>
<h2>Got Questions?</h2>
<p>For further information, you may email the CARISCA Research and Training Coordinator, Martin Agbodzi: <a href="mailto:mmagbodzi@carisca.knust.edu.gh">mmagbodzi@carisca.knust.edu.gh</a></p>
<h2>Scholarship Success Stories</h2>
<ul>
<li><a href="/news/funding-curiosity-evans-story"><strong>Funding Curiosity</strong></a>: Evans Amoah (PhD Business and Management)</li>
<li><a href="/news/fueling-dreams-with-scholarships"><strong>Fueling Dreams</strong></a>: Olivia Adu Poku (MSc. Logistics and Supply Chain Management)</li>
</ul>`,
  },
  {
    path: 'training/masterclass-experience',
    importedSha256: '1f16579570ad8b34f6199e277e0ccf3dc4601390a2134d97ee5d95547920dfac',
    body: `<p><img src="legacy:${WP}/2025/04/CARISCA-Google-Form-Header-1.png" alt="Lead, Create, Innovate: The Masterclass Experience, by CARISCA and Coral Reef Innovation Hub" /></p>
<p><strong>Hosted by CARISCA &amp; Coral Reef Innovation Hub</strong></p>
<p>A transformational series in leadership, technology, and innovation designed to elevate professionals, entrepreneurs, and emerging leaders across Africa.</p>
<h2>Who Should Attend?</h2>
<ul>
<li>Early-to-mid career professionals</li>
<li>Entrepreneurs and innovators</li>
<li>Tech enthusiasts</li>
<li>Managers and team leads</li>
<li>Students and recent graduates</li>
</ul>
<h2>Why Join?</h2>
<p>In today’s fast-moving world, staying ahead means more than just having knowledge. It’s about having the <strong>right skills</strong>, the <strong>right mindset</strong>, and the <strong>right network</strong>. This MasterClass Experience is your gateway to:</p>
<ul>
<li><strong>Mastering cutting-edge tools</strong> like AI, digital communication, and prompt engineering that are shaping the future of work.</li>
<li><strong>Becoming a confident leader</strong>, ready to navigate complexity, inspire teams, and drive innovation in any industry.</li>
<li><strong>Gaining practical skills</strong></li>
<li><strong>Learning from top experts</strong> in tech, leadership, and entrepreneurship who understand the African and global business landscapes.</li>
<li><strong>Connecting with a community of high-potential peers</strong>, mentors, and future collaborators who share your ambition and drive.</li>
</ul>
<h2>Certification</h2>
<p>Participants will receive an official <strong>Certificate</strong> from CARISCA and Coral Reef Innovation Hub, recognizing their commitment to continuous learning and excellence.</p>
<h2>Schedule &amp; Fees</h2>
<p>Our carefully designed MasterClasses run from <strong>May to December 2025</strong>, offering flexible options to suit your availability and location. Whether you’re joining us in person or online, you’ll gain access to the same high-quality content and expert-led sessions.</p>
<p><strong>In-person sessions</strong> will be held at:</p>
<ul>
<li><strong>Accra:</strong> CARISCA Accra Office, KNUST Guest House, Osu</li>
<li><strong>Kumasi:</strong> Amono-Neizer Conference Room, KNUST Poolside</li>
</ul>
<p><strong>Can’t make it in person? No problem.</strong> Online participation is available for all sessions.</p>
<h3>Masterclass Schedule (May–December 2025)</h3>
<table>
<thead><tr><th>Masterclass</th><th>Dates &amp; Location</th><th>Training Fee</th></tr></thead>
<tbody>
<tr><td><strong>Prompt Essentials Masterclass</strong></td><td>May 27, Kumasi<br />May 29, Accra<br />Sept 18, Kumasi<br />Sept 25, Accra</td><td>Gh₵4,000</td></tr>
<tr><td><strong>Intel AI Mastercoach</strong> (Python background)</td><td>June 9-12, Accra<br />Dec. 8-11, Kumasi</td><td>Gh₵20,000</td></tr>
<tr><td><strong>Soft Skills</strong></td><td>Aug. 19, Accra<br />Aug. 27, Kumasi</td><td>Gh₵8,000</td></tr>
<tr><td><strong>Digital Skills</strong></td><td>Aug. 20, Accra<br />Aug. 28, Kumasi</td><td>Gh₵12,000</td></tr>
<tr><td><strong>Managing Up</strong></td><td>Sept. 30, Kumasi<br />Oct. 22, Accra</td><td>Gh₵10,000</td></tr>
<tr><td><strong>Managing Down</strong></td><td>Oct. 1, Kumasi<br />Oct. 23, Accra</td><td>Gh₵10,000</td></tr>
<tr><td><strong>Crucial Conversations</strong></td><td>Oct. 2, Accra<br />Oct. 24, Kumasi</td><td>Gh₵10,000</td></tr>
<tr><td><strong>Entrepreneurship</strong></td><td>Nov. 10-14, Accra<br />Nov. 24-28, Kumasi</td><td>Gh₵13,000</td></tr>
</tbody>
</table>`,
  },
];
