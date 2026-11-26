// Fictional sample people, givers and organisations that admins can load to
// show testers every feature. Every account email ends with SAMPLE_EMAIL_SUFFIX
// so "Remove sample data" can find and delete all of it. Photos are generated
// illustrations in public/samples (no real people). Bank details are fake.

import type { Category, PayeeType } from "@/lib/sectors";

export const SAMPLE_EMAIL_SUFFIX = ".sample@example.com";
export const sampleEmail = (handle: string) => `${handle}${SAMPLE_EMAIL_SUFFIX}`;

/** How a sample need appears: live and verified, live in escrow, time-sensitive, finished with an update, or waiting for review. */
export type SampleKind = "verified" | "escrow" | "urgent" | "completed" | "submitted";

export type SampleNeed = {
  handle: string;
  name: string;
  state: string;
  city: string;
  relationship: "self" | "parent" | "guardian" | "teacher" | "religious_leader" | "other";
  minor?: boolean;
  title: string;
  story: string;
  words: string;
  amount: number; // naira
  payee: { name: string; type: PayeeType };
  kind: SampleKind;
  /** Share of the amount already given (live needs). */
  raised?: number;
  /** Days until the deadline (time-sensitive needs). */
  deadlineDays?: number;
  photos: string[];
  update?: { body: string; milestone: string; photos: string[]; receipt: string };
  bio?: string;
  occupation?: string;
};

export const SAMPLE_NEEDS: Record<Category, SampleNeed[]> = {
  education: [
    {
      handle: "adaeze", name: "Adaeze", state: "Enugu", city: "Nsukka", relationship: "parent", minor: true,
      title: "SS2 fees and textbooks", amount: 185000, kind: "verified", raised: 0.55,
      payee: { name: "Unity Model College", type: "school" },
      story: "Adaeze is in SS2 and tops her class in chemistry. Her mother runs a small tailoring stall and covered first term, but a slow season left a gap for second term and the new textbooks.",
      words: "I want to be a pharmacist and open a shop in my town.",
      photos: ["ed-school", "ed-books", "ed-classroom"],
    },
    {
      handle: "kunle", name: "Kunle", state: "Oyo", city: "Ibadan", relationship: "self",
      title: "Final-year university fees", amount: 320000, kind: "urgent", raised: 0.35, deadlineDays: 9,
      payee: { name: "University of Ibadan Bursary", type: "school" },
      story: "Kunle studies Civil Engineering and is in his final year. The bursary has set a firm date for clearing fees before final exams. He tutors maths on weekends and has saved part of it.",
      words: "One more semester and I can start building roads for my state.",
      photos: ["ed-exam", "ed-books"], occupation: "Student",
    },
    {
      handle: "zainab", name: "Zainab", state: "Kano", city: "Kano", relationship: "guardian", minor: true,
      title: "JSS3 fees and BECE registration", amount: 95000, kind: "escrow", raised: 0.2,
      payee: { name: "Sabon Gari Girls Secondary School", type: "school" },
      story: "Zainab is preparing for BECE. Her aunt, who looks after her, has paid the admission levy. The balance covers this term and the exam registration the school submits next month.",
      words: "I like solving puzzles. Maths is my favourite subject.",
      photos: ["ed-uniform", "ed-classroom"],
    },
    {
      handle: "tobi", name: "Tobi", state: "Lagos", city: "Ikorodu", relationship: "parent", minor: true,
      title: "WAEC fees and final-term balance", amount: 140000, kind: "completed",
      payee: { name: "Ikorodu Grammar School", type: "school" },
      story: "Tobi sat WAEC this year. Givers on Dreamer cleared his balance and the money was paid straight to his school.",
      words: "I want to study computer science.",
      photos: ["ed-school", "ed-exam"],
      update: { body: "Tobi sat all nine WAEC papers and his school says he is on track for strong results. Thank you to everyone who made this possible. The receipt from the school is attached.", milestone: "fees_paid", photos: ["pr-thanks", "ed-exam"], receipt: "rc-school" },
    },
    {
      handle: "halima", name: "Halima", state: "Kaduna", city: "Zaria", relationship: "teacher", minor: true,
      title: "SS1 fees, uniform and sandals", amount: 78000, kind: "submitted",
      payee: { name: "Zaria Community Secondary School", type: "school" },
      story: "Halima has just moved up to senior secondary. Her teacher is sharing her need because her father, a driver, has been out of work since his vehicle broke down.",
      words: "I want to be a teacher like Mrs Bello.",
      photos: ["ed-uniform"],
    },
  ],
  healthcare: [
    {
      handle: "emeka", name: "Emeka", state: "Anambra", city: "Onitsha", relationship: "self",
      title: "Hernia surgery at the general hospital", amount: 450000, kind: "urgent", raised: 0.4, deadlineDays: 6,
      payee: { name: "St. Luke's Hospital Onitsha", type: "hospital" },
      story: "Emeka is a welder. The hospital has scheduled his hernia repair and needs the deposit before the theatre date. He has paid for the scans and tests himself.",
      words: "I need to get back to work and look after my family.",
      photos: ["hc-clinic", "hc-checkup"], occupation: "Welder",
    },
    {
      handle: "blessing", name: "Blessing", state: "Rivers", city: "Port Harcourt", relationship: "self",
      title: "Antenatal care and safe delivery", amount: 260000, kind: "verified", raised: 1,
      payee: { name: "Rivers Mother and Child Hospital", type: "hospital" },
      story: "Blessing is expecting her first baby in two months. The hospital's maternity package covers check-ups, delivery and the first newborn visits.",
      words: "I want my baby to arrive safely.",
      photos: ["hc-ward", "hc-clinic"],
    },
    {
      handle: "musa", name: "Musa", state: "Plateau", city: "Jos", relationship: "parent", minor: true,
      title: "Asthma medication for six months", amount: 85000, kind: "escrow", raised: 0.15,
      payee: { name: "Jos Central Pharmacy", type: "pharmacy" },
      story: "Musa is nine and has asthma. His inhalers and preventer medicine cost more than his family can manage each month. The pharmacy will supply six months of medication.",
      words: "I want to play football without stopping.",
      photos: ["hc-pharmacy"],
    },
    {
      handle: "ngozi", name: "Ngozi", state: "Imo", city: "Owerri", relationship: "self",
      title: "Cataract surgery to see clearly again", amount: 380000, kind: "completed",
      payee: { name: "Owerri Eye Clinic", type: "hospital" },
      story: "Ngozi is a retired teacher. Givers covered her cataract surgery, paid directly to the eye clinic.",
      words: "I want to read my Bible again.",
      photos: ["hc-clinic", "hc-checkup"],
      update: { body: "The surgery went well and Ngozi can read again. She says the first thing she read was a letter from her granddaughter. The clinic receipt is attached.", milestone: "treated", photos: ["pr-thanks", "hc-ward"], receipt: "rc-hospital" },
    },
    {
      handle: "ibrahim", name: "Ibrahim", state: "Bauchi", city: "Bauchi", relationship: "other",
      title: "Physiotherapy after a road accident", amount: 210000, kind: "submitted", deadlineDays: 12,
      payee: { name: "Bauchi Specialist Hospital", type: "hospital" },
      story: "Ibrahim was hurt in a road accident and needs eight weeks of physiotherapy to walk without crutches. His cousin is sharing his need while he recovers.",
      words: "I want to walk to the mosque on my own again.",
      photos: ["hc-ward"],
    },
  ],
  housing: [
    {
      handle: "funmi", name: "Funmi", state: "Lagos", city: "Yaba", relationship: "self",
      title: "Rent arrears for a one-room apartment", amount: 420000, kind: "urgent", raised: 0.5, deadlineDays: 14,
      payee: { name: "Adeyemi Properties", type: "landlord" },
      story: "Funmi is a hairdresser with two children. Her shop was closed for months during road works, and she fell behind on rent. The landlord has agreed to wait until the end of the month.",
      words: "A safe home means my children can focus on school.",
      photos: ["ho-room", "ho-street"], occupation: "Hairdresser",
    },
    {
      handle: "chidi", name: "Chidi", state: "Abia", city: "Aba", relationship: "self",
      title: "First year's rent in a new flat", amount: 350000, kind: "verified", raised: 0.3,
      payee: { name: "Aba Homes Estate Agents", type: "landlord" },
      story: "Chidi has a new job at a shoe factory and needs to move closer to work. He has saved the agency fee. The balance is the first year's rent, paid straight to the agent.",
      words: "A new job and a new start.",
      photos: ["ho-keys", "ho-house"],
    },
    {
      handle: "amina", name: "Amina", state: "Kwara", city: "Ilorin", relationship: "self",
      title: "Rent for a family of five", amount: 280000, kind: "escrow", raised: 0.1,
      payee: { name: "Ilorin Property Services", type: "landlord" },
      story: "Amina's husband passed away last year and she now sells foodstuff to support five children. The family needs to renew their rent to stay near the children's school.",
      words: "I want my children to stay in the same school.",
      photos: ["ho-house"],
    },
    {
      handle: "sola", name: "Sola", state: "Ogun", city: "Abeokuta", relationship: "self",
      title: "Rent after moving out of a flooded home", amount: 300000, kind: "completed",
      payee: { name: "Abeokuta Realty", type: "landlord" },
      story: "Sola's home flooded twice last rainy season. Givers paid a year's rent on a safer flat, paid directly to the landlord.",
      words: "Dry floors and a good night's sleep.",
      photos: ["ho-house", "ho-keys"],
      update: { body: "We moved in last week. The new flat is on higher ground and the children have their own corner to study. Thank you all. The landlord's receipt is attached.", milestone: "moved_in", photos: ["pr-moved-in", "ho-room"], receipt: "rc-rent" },
    },
    {
      handle: "yemi", name: "Yemi", state: "Osun", city: "Osogbo", relationship: "religious_leader",
      title: "Rent for an elderly widow", amount: 180000, kind: "submitted",
      payee: { name: "Osogbo Landlords Association", type: "landlord" },
      story: "Mama Yemi is 74 and lives alone. Her pastor is sharing her need so she can renew the rent on the room she has lived in for twenty years.",
      words: "This room is my home.",
      photos: ["ho-street"],
    },
  ],
  livelihood: [
    {
      handle: "grace", name: "Grace", state: "Edo", city: "Benin City", relationship: "self",
      title: "Industrial sewing machine for my tailoring", amount: 235000, kind: "verified", raised: 0.6,
      payee: { name: "Aba Machines & Supply", type: "supplier" },
      story: "Grace finished her tailoring apprenticeship and sews on a borrowed manual machine. An industrial machine would let her take school uniform orders for the new term.",
      words: "I want my own fashion house with three apprentices.",
      photos: ["lv-sewing", "lv-shop"], occupation: "Tailor",
    },
    {
      handle: "kabiru", name: "Kabiru", state: "Katsina", city: "Katsina", relationship: "self",
      title: "Grinding machine for a food business", amount: 190000, kind: "escrow", raised: 0.25,
      payee: { name: "Northern Agro Equipment", type: "supplier" },
      story: "Kabiru grinds pepper, tomatoes and grains for women in his area. His old machine broke down. A new one from the supplier will get him back to work.",
      words: "My whole street brings their grinding to me.",
      photos: ["lv-market"],
    },
    {
      handle: "titi", name: "Titi", state: "Ondo", city: "Akure", relationship: "self",
      title: "Restock my provisions shop", amount: 150000, kind: "urgent", raised: 0.45, deadlineDays: 10,
      payee: { name: "Akure Wholesale Distributors", type: "supplier" },
      story: "Titi's shop was emptied by a burglary. The wholesaler is holding a restock order at the old price until the end of next week.",
      words: "My customers have been asking when I will open again.",
      photos: ["lv-shop"],
    },
    {
      handle: "obinna", name: "Obinna", state: "Ebonyi", city: "Abakaliki", relationship: "self",
      title: "Seeds and fertiliser for the rice season", amount: 260000, kind: "completed",
      payee: { name: "Ebonyi Farm Inputs", type: "supplier" },
      story: "Obinna farms two hectares of rice. Givers paid the input supplier for improved seed and fertiliser.",
      words: "A good harvest feeds my family and my neighbours.",
      photos: ["lv-farm"],
      update: { body: "The seedlings are up and the field looks healthy. The extension officer says we should get almost double last year's harvest. Receipt from the supplier attached.", milestone: "stock_bought", photos: ["lv-farm"], receipt: "rc-supplier" },
    },
    {
      handle: "fatima", name: "Fatima", state: "Sokoto", city: "Sokoto", relationship: "self",
      title: "Freezer for a cold drinks business", amount: 210000, kind: "submitted",
      payee: { name: "Sokoto Appliance Centre", type: "supplier" },
      story: "Fatima sells zobo and kunu near a busy motor park. A chest freezer would let her keep stock cold all day and double her sales.",
      words: "Cold drinks sell twice as fast.",
      photos: ["lv-market"],
    },
  ],
  skills: [
    {
      handle: "david", name: "David", state: "Delta", city: "Warri", relationship: "self",
      title: "Web development bootcamp", amount: 180000, kind: "verified", raised: 0.5,
      payee: { name: "Delta Tech Hub", type: "training_centre" },
      story: "David taught himself HTML on his phone. He passed the entry test for a 16-week web development cohort that places graduates in paid internships.",
      words: "I want to build apps for Nigerian businesses.",
      photos: ["sk-laptop"], occupation: "Phone repairer",
    },
    {
      handle: "esther", name: "Esther", state: "Benue", city: "Makurdi", relationship: "self",
      title: "Solar installation training and toolkit", amount: 150000, kind: "escrow", raised: 0.3,
      payee: { name: "Makurdi Renewable Energy Institute", type: "training_centre" },
      story: "Esther wants to install solar systems for homes and shops. The institute's course includes a certificate and a starter toolkit.",
      words: "Women can light up homes too.",
      photos: ["sk-solar", "sk-tools"],
    },
    {
      handle: "samuel", name: "Samuel", state: "Cross River", city: "Calabar", relationship: "self",
      title: "Electrical installation trade test", amount: 95000, kind: "urgent", raised: 0.6, deadlineDays: 7,
      payee: { name: "Calabar Technical Training Centre", type: "training_centre" },
      story: "Samuel has finished his apprenticeship. The trade test registration closes next week and he needs the fee and practical materials.",
      words: "With my certificate I can work on real sites.",
      photos: ["sk-tools"],
    },
    {
      handle: "joy", name: "Joy", state: "Akwa Ibom", city: "Uyo", relationship: "self",
      title: "Fashion design certificate course", amount: 120000, kind: "completed",
      payee: { name: "Uyo Fashion Academy", type: "training_centre" },
      story: "Joy completed her fashion design course. Givers paid the academy directly.",
      words: "Now I can make my own patterns.",
      photos: ["lv-sewing"],
      update: { body: "I graduated with distinction and I have already taken my first wedding order. Thank you for believing in me. The academy receipt and my certificate are attached.", milestone: "certified", photos: ["pr-certificate", "lv-sewing"], receipt: "rc-training" },
    },
    {
      handle: "aisha", name: "Aisha", state: "Niger", city: "Minna", relationship: "self",
      title: "Hairdressing and beauty training", amount: 85000, kind: "submitted",
      payee: { name: "Minna Beauty School", type: "training_centre" },
      story: "Aisha wants to open a salon. The beauty school offers a six-month course with practice clients and a starter kit.",
      words: "I already braid for my friends. Now I want to do it properly.",
      photos: ["sk-salon"],
    },
  ],
  emergency: [
    {
      handle: "peter", name: "Peter", state: "Bayelsa", city: "Yenagoa", relationship: "self",
      title: "Food and essentials after the flood", amount: 95000, kind: "urgent", raised: 0.4, deadlineDays: 5,
      payee: { name: "Rivers Relief Partners", type: "relief_partner" },
      story: "Peter's family lost their food stock and bedding when the river overflowed. The relief partner will deliver a food and essentials pack for a family of six.",
      words: "We just need to get through the next month.",
      photos: ["em-flood", "em-food"],
    },
    {
      handle: "hauwa", name: "Hauwa", state: "Borno", city: "Maiduguri", relationship: "religious_leader",
      title: "Replacing cooking items after a fire", amount: 70000, kind: "verified", raised: 1,
      payee: { name: "Maiduguri Community Relief", type: "relief_partner" },
      story: "A kitchen fire destroyed Hauwa's pots, stove and food. Her imam is sharing the need so the relief partner can replace the essentials.",
      words: "I cook for my children and my neighbours' children.",
      photos: ["em-relief"],
    },
    {
      handle: "chioma", name: "Chioma", state: "Anambra", city: "Ogbaru", relationship: "self",
      title: "Mattresses and blankets for my family", amount: 85000, kind: "escrow", raised: 0.2,
      payee: { name: "Ogbaru Flood Response", type: "relief_partner" },
      story: "Chioma's family is staying with relatives after the flood. The relief partner will supply mattresses, blankets and mosquito nets.",
      words: "My children need a dry place to sleep.",
      photos: ["em-tent", "em-relief"],
    },
    {
      handle: "yusuf", name: "Yusuf", state: "Kogi", city: "Lokoja", relationship: "self",
      title: "Food for a family after the flood", amount: 90000, kind: "completed",
      payee: { name: "Kogi Relief Partners", type: "relief_partner" },
      story: "Givers paid for a month of food for Yusuf's family, delivered by the relief partner.",
      words: "Thank you for standing with us.",
      photos: ["em-food"],
      update: { body: "The food pack arrived on Saturday: rice, beans, garri, oil and soap. We are back in our house and cleaning up. Thank you. The relief partner's receipt is attached.", milestone: "back_on_feet", photos: ["em-food", "pr-thanks"], receipt: "rc-relief" },
    },
    {
      handle: "ruth", name: "Ruth", state: "Niger", city: "Mokwa", relationship: "other",
      title: "School supplies lost in the flood", amount: 60000, kind: "submitted", deadlineDays: 15,
      payee: { name: "Mokwa Emergency Desk", type: "relief_partner" },
      story: "Ruth's three children lost their books and uniforms in the flood. Their neighbour is sharing the need so they can go back to school when it reopens.",
      words: "School opens soon and they have nothing.",
      photos: ["em-flood"],
    },
  ],
};

export type SampleGiver = { handle: string; name: string; state: string; city: string; bio: string; occupation: string; socials?: Record<string, string>; anonymousSome?: boolean };

export const SAMPLE_GIVERS: SampleGiver[] = [
  { handle: "tunde", name: "Tunde", state: "Lagos", city: "Lekki", bio: "Product manager. I give to school fees every term.", occupation: "Product manager", socials: { linkedin: "https://www.linkedin.com/in/sample-tunde", x: "https://x.com/sample_tunde" } },
  { handle: "nkechi", name: "Nkechi", state: "FCT", city: "Abuja", bio: "Doctor. Healthcare needs are close to my heart.", occupation: "Doctor", socials: { instagram: "https://www.instagram.com/sample.nkechi" } },
  { handle: "femi", name: "Femi", state: "Oyo", city: "Ibadan", bio: "Small business owner backing small businesses.", occupation: "Business owner", socials: { facebook: "https://www.facebook.com/sample.femi" } },
  { handle: "aisha-g", name: "Aisha", state: "Kano", city: "Kano", bio: "Teacher. Education changes families.", occupation: "Teacher" },
  { handle: "uche", name: "Uche", state: "Rivers", city: "Port Harcourt", bio: "Engineer giving back to my community.", occupation: "Engineer", socials: { linkedin: "https://www.linkedin.com/in/sample-uche" } },
  { handle: "bisi", name: "Bisi", state: "Lagos", city: "Ikeja", bio: "I like seeing the updates. That's the best part.", occupation: "Accountant", anonymousSome: true },
  { handle: "olu", name: "Olu", state: "Ogun", city: "Abeokuta", bio: "Retired banker. I back a new dream every month.", occupation: "Retired" },
  { handle: "sade", name: "Sade", state: "Diaspora", city: "London", bio: "Nigerian in the UK, giving back home.", occupation: "Nurse", socials: { instagram: "https://www.instagram.com/sample.sade" } },
];

export type SampleOrg = {
  handle: string;
  contact: string;
  name: string;
  type: "orphanage" | "charity_home" | "ngo" | "foundation" | "faith_based" | "community" | "social_enterprise";
  tagline: string;
  about: string;
  impact: string;
  people: number;
  founded: number;
  state: string;
  city: string;
  website?: string;
  socials: Record<string, string>;
  verified: boolean;
  photos: { file: string; caption: string; sensitive?: boolean; onRequest?: boolean }[];
  needs: { title: string; category: Category; story: string; words: string; amount: number; kind: SampleKind; raised?: number; deadlineDays?: number; photos: string[] }[];
};

export const SAMPLE_ORGS: SampleOrg[] = [
  {
    handle: "hope-home", contact: "Mrs Dung", name: "Hope Children's Home", type: "orphanage",
    tagline: "A safe, loving home for 42 children in Jos.",
    about: "Hope Children's Home has cared for children without parental care since 2009. Children live in family-style houses with house mothers, attend local schools, and are supported into university, trades and work.",
    impact: "Since 2009: 160 children cared for, 38 into university or polytechnic, 25 into trades. Every child is in school this term.",
    people: 42, founded: 2009, state: "Plateau", city: "Jos", website: "https://example.com/hope-home",
    socials: { facebook: "https://www.facebook.com/sample.hopehome", instagram: "https://www.instagram.com/sample.hopehome" },
    verified: true,
    photos: [
      { file: "og-home", caption: "Our main house in Jos" },
      { file: "og-dining", caption: "Lunch time in the dining hall" },
      { file: "og-garden", caption: "The children's vegetable garden" },
      { file: "ed-classroom", caption: "Homework club after school" },
      { file: "og-outreach", caption: "Annual health check day", onRequest: true },
    ],
    needs: [
      { title: "School fees for 12 children this term", category: "education", amount: 480000, kind: "verified", raised: 0.6, story: "Twelve of our children are in secondary school. This covers their second-term fees, paid to their schools through our verified account.", words: "Every child in school, every term.", photos: ["ed-school", "ed-books"] },
      { title: "Food for the home for one month", category: "emergency", amount: 180000, kind: "urgent", raised: 0.3, deadlineDays: 8, story: "Food prices have risen sharply. This covers rice, beans, oil and fresh food for 42 children for a month.", words: "Three good meals a day.", photos: ["em-food", "og-dining"] },
    ],
  },
  {
    handle: "golden-years", contact: "Mr Okafor", name: "Golden Years Care Home", type: "charity_home",
    tagline: "Dignified care for elderly people living alone.",
    about: "Golden Years provides day care, meals and nursing visits for elderly people in Enugu who live alone or whose families live far away.",
    impact: "65 elders supported each week with meals, check-ups and company.",
    people: 65, founded: 2015, state: "Enugu", city: "Enugu",
    socials: { facebook: "https://www.facebook.com/sample.goldenyears" },
    verified: true,
    photos: [
      { file: "og-elders", caption: "Afternoon in the garden" },
      { file: "hc-checkup", caption: "Weekly nurse visits" },
      { file: "og-dining", caption: "Shared lunch" },
    ],
    needs: [
      { title: "Blood pressure medication for 30 elders", category: "healthcare", amount: 360000, kind: "verified", raised: 0.45, story: "Thirty of our elders take daily blood pressure medicine. This covers three months of supply, paid through our verified account to our partner pharmacy.", words: "Healthy hearts, happy elders.", photos: ["hc-pharmacy", "og-elders"] },
    ],
  },
  {
    handle: "girls-first", contact: "Hajiya Maryam", name: "Girls First Initiative", type: "ngo",
    tagline: "Keeping girls in school across northern Nigeria.",
    about: "Girls First works with families, schools and community leaders in Kano and Kaduna to help girls stay in school through secondary education.",
    impact: "1,200 girls supported with fees, uniforms and mentoring since 2017. 94% completed the school year.",
    people: 1200, founded: 2017, state: "Kano", city: "Kano", website: "https://example.com/girls-first",
    socials: { x: "https://x.com/sample_girlsfirst", linkedin: "https://www.linkedin.com/company/sample-girlsfirst", instagram: "https://www.instagram.com/sample.girlsfirst" },
    verified: true,
    photos: [
      { file: "ed-classroom", caption: "Mentoring session" },
      { file: "ed-uniform", caption: "Uniform day" },
      { file: "ed-books", caption: "Textbook packs ready" },
    ],
    needs: [
      { title: "Uniforms and books for 50 girls", category: "education", amount: 450000, kind: "verified", raised: 0.25, story: "Fifty girls starting JSS1 need uniforms, sandals and textbooks. We buy in bulk from local suppliers.", words: "The first day of school should feel proud.", photos: ["ed-uniform", "ed-books"] },
      { title: "WAEC registration for 20 girls", category: "education", amount: 400000, kind: "completed", story: "Twenty of our SS3 girls needed WAEC registration. Givers covered it in full.", words: "Every girl sits her exams.", photos: ["ed-exam"] },
    ],
  },
  {
    handle: "lagos-health", contact: "Dr Bello", name: "Lagos Health Outreach Foundation", type: "foundation",
    tagline: "Free health checks in underserved communities.",
    about: "Our volunteer doctors and nurses run monthly free clinics in Lagos communities and pay for follow-up treatment when people can't afford it.",
    impact: "8,000 free health checks since 2019, and 400 follow-up treatments funded.",
    people: 8000, founded: 2019, state: "Lagos", city: "Ikeja",
    socials: { instagram: "https://www.instagram.com/sample.lagoshealth", youtube: "https://www.youtube.com/@sample-lagoshealth" },
    verified: true,
    photos: [
      { file: "og-outreach", caption: "Free clinic day in Makoko" },
      { file: "hc-clinic", caption: "Our partner hospital" },
      { file: "hc-ward", caption: "Patient recovering after surgery", sensitive: true },
    ],
    needs: [
      { title: "Monthly free clinic supplies", category: "healthcare", amount: 300000, kind: "escrow", raised: 0.2, story: "Test strips, basic medicines and transport for volunteer staff for our next three clinic days.", words: "Health care should come to the community.", photos: ["og-outreach"] },
    ],
  },
  {
    handle: "grace-kitchen", contact: "Pastor Ade", name: "Grace Community Kitchen", type: "faith_based",
    tagline: "Hot meals and food parcels in Ibadan.",
    about: "Run by volunteers from local churches and mosques, Grace Community Kitchen serves hot lunches three days a week and food parcels to families in crisis.",
    impact: "Around 300 meals a week and 50 family food parcels a month.",
    people: 300, founded: 2020, state: "Oyo", city: "Ibadan",
    socials: { facebook: "https://www.facebook.com/sample.gracekitchen" },
    verified: true,
    photos: [
      { file: "og-dining", caption: "Wednesday lunch" },
      { file: "em-food", caption: "Food parcels packed" },
    ],
    needs: [
      { title: "Food parcels for 40 families", category: "emergency", amount: 200000, kind: "verified", raised: 0.5, story: "Forty families referred by local clinics and schools will each get a two-week food parcel.", words: "No family should go to bed hungry.", photos: ["em-food", "em-relief"] },
    ],
  },
  {
    handle: "skills-lab", contact: "Mr Ekpo", name: "Rivers Youth Skills Lab", type: "social_enterprise",
    tagline: "Trades and tech skills for young people in Port Harcourt.",
    about: "We run short courses in solar installation, phone repair and coding, and connect graduates with employers.",
    impact: "Founded this year. Waiting for Dreamer's review before taking gifts.",
    people: 80, founded: 2026, state: "Rivers", city: "Port Harcourt",
    socials: { linkedin: "https://www.linkedin.com/company/sample-skillslab" },
    verified: false,
    photos: [
      { file: "sk-solar", caption: "Solar practical day" },
      { file: "sk-laptop", caption: "Coding class" },
    ],
    needs: [],
  },
];
