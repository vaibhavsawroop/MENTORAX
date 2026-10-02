/**
 * Central, presentation-ready content for MentoraX.
 *
 * Replace only the values marked `awaiting details` / `TBA` as the programme,
 * mentor profiles, product pages, and official legal copy are approved.
 */

export type ContentStatus = 'ready' | 'awaiting-details' | 'awaiting-link';

export type Action = {
  label: string;
  href: string;
  external?: boolean;
  disabled?: boolean;
};

export type MediaAsset = {
  src: string;
  alt: string;
  status?: ContentStatus;
};

export type MentorshipPlan = {
  id: string;
  name: string;
  badge?: string;
  summary: string;
  price: 'TBA';
  billingNote: string;
  featured?: boolean;
  features: string[];
  cta: Action;
  status: ContentStatus;
};

export type StudyMaterial = {
  id: string;
  title: string;
  subject: string;
  format: string;
  description: string;
  driveUrl: string | null;
  accessNote: string;
  status: ContentStatus;
};

export type Book = {
  id: string;
  title: string;
  subtitle: string;
  cover: MediaAsset;
  price: 'TBA';
  description: string;
  purchaseUrl: string | null;
  status: ContentStatus;
};

export type Person = {
  id: string;
  name: string;
  role: string;
  introduction: string;
  qualifications: string[];
  focus: string[];
  photo: MediaAsset;
  status: ContentStatus;
};

export type Faq = {
  question: string;
  answer: string;
};

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalPage = {
  route: '/privacy' | '/terms' | '/refund-policy';
  title: string;
  eyebrow: string;
  lastUpdated: string;
  reviewNotice?: string;
  sections: LegalSection[];
};

export type StudentTestimonial = {
  id: string;
  author: string;
  handle: string;
  college: string;
  comment: string;
  reply?: string;
  badge?: string;
};

export const studentTestimonials: StudentTestimonial[] = [
  {
    id: 'komal-patel',
    author: 'Komal Patel',
    handle: '@KomalPatel-fl1qg',
    college: 'IISER Mohali',
    comment: 'Thanks bhaiya… I got iiser mohali and I want the same 😊… you helped us a lot…. thank u',
    reply: 'Your most welcome 💫 @rajiisrit007',
    badge: 'IISER Mohali'
  },
  {
    id: 'leena',
    author: 'Leena',
    handle: '@Leena_215',
    college: 'IISER Bhopal',
    comment: 'Thanks bhaiya , got liser Bhopal 🙏',
    reply: 'Super proud of your dedication Leena! 🎓',
    badge: 'IISER Bhopal'
  },
  {
    id: 'nirab-mandal',
    author: 'Nirab Mandal',
    handle: '@nirabmandal8800',
    college: 'IISER Tirupati',
    comment: 'iiser tirupati 🎉 😂😂 The mock analysis check-ins made all the difference!',
    reply: 'Awesome achievement Nirab! All the best! 🚀',
    badge: 'IISER Tirupati'
  },
  {
    id: 'prince',
    author: 'Prince',
    handle: '@Prince_verse152',
    college: 'IISER Berhampur',
    comment: 'liser berhampur 🎉 😊😊 MentoraX strategy guides saved my revision stretch!',
    reply: 'Keep soaring high Prince! Hard work pays off. ✨',
    badge: 'IISER Berhampur'
  }
];

export const driveResourceHub =
  'https://drive.google.com/drive/folders/1jcT2Mqr22RvRhepqc3qxKThOZHG2g4LC';

export const brand = {
  name: 'MentoraX',
  tagline: 'The focused edge for IAT & NEST aspirants.',
  description:
    'MentoraX is a mentorship-led learning space for aspirants preparing for IAT and NEST, built around clarity, consistency, and better exam decisions.',
  managedBy: 'Managed by Raj & Dipti.',
  primaryCta: {
    label: 'Explore mentorship',
    href: '/mentorship',
  } satisfies Action,
  secondaryCta: {
    label: 'Meet the mentors',
    href: '/mentors',
  } satisfies Action,
} as const;

export const homeContent = {
  eyebrow: 'IAT + NEST mentorship',
  headline: 'Prepare with direction.\nWalk into your exam with intent.',
  supportingText:
    'A high-trust mentorship experience for science aspirants who want a sharper plan, a calmer process, and guidance that stays close to the real exam.',
  mission:
    'Make high-quality mentorship feel personal, practical, and accessible to every serious IAT and NEST aspirant.',
  vision:
    'Build a generation of science learners who prepare deeply, think independently, and choose their next step with confidence.',
  principles: [
    {
      title: 'Clarity over noise',
      body: 'A smaller number of useful decisions beats an endless list of resources.',
    },
    {
      title: 'Mentorship that notices',
      body: 'Thoughtful guidance for the questions that a timetable cannot answer.',
    },
    {
      title: 'Exam-aware learning',
      body: 'Preparation designed around IAT and NEST, not generic entrance-exam advice.',
    },
  ],
  achievementCards: [
    {
      label: 'Built for',
      value: 'IAT + NEST',
      detail: 'A single, focused preparation ecosystem.',
    },
    {
      label: 'Guided by',
      value: '4 mentors',
      detail: 'Profile details are being published with the team.',
    },
    {
      label: 'Led by',
      value: 'Raj & Dipti',
      detail: 'The people shaping the MentoraX experience.',
    },
  ],
} as const;

export const mentorshipPlans: MentorshipPlan[] = [
  {
    id: 'guided-core',
    name: 'Guided Core',
    badge: 'Programme details soon',
    summary: 'A structured starting point for a confident IAT & NEST preparation routine.',
    price: 'TBA',
    billingNote: 'Final inclusions, cohort dates, and pricing will be announced before enrolment opens.',
    features: [
      'A guided study roadmap',
      'Mentor-led doubt support',
      'Resource and revision direction',
      'Exam-aware preparation checkpoints',
    ],
    cta: { label: 'Enrolment updates', href: '/contact?subject=guided-core' },
    status: 'awaiting-details',
  },
  {
    id: 'complete-mentorship',
    name: 'Complete Mentorship',
    badge: 'Flagship',
    summary: 'The full MentoraX mentorship journey, designed for aspirants who want sustained guidance.',
    price: 'TBA',
    billingNote: 'Final inclusions, cohort dates, and pricing will be announced before enrolment opens.',
    featured: true,
    features: [
      'Everything in Guided Core',
      'Personal preparation check-ins',
      'Test-analysis and next-step guidance',
      'Priority access to programme resources',
    ],
    cta: { label: 'Join the interest list', href: '/contact?subject=complete-mentorship' },
    status: 'awaiting-details',
  },
  {
    id: 'one-to-one',
    name: '1:1 Strategy Session',
    badge: 'Limited availability',
    summary: 'A concentrated conversation to help you reset your study strategy and priorities.',
    price: 'TBA',
    billingNote: 'Format, availability, and pricing are subject to mentor schedules.',
    features: [
      'Preparation audit',
      'Personal study-priority map',
      'A clear next-action plan',
      'Follow-up format to be announced',
    ],
    cta: { label: 'Ask about availability', href: '/contact?subject=one-to-one' },
    status: 'awaiting-details',
  },
];

export const mentorshipHighlights = [
  {
    title: 'A plan you can follow',
    body: 'Bring the syllabus, revision, and test strategy into a sequence that makes sense for you.',
  },
  {
    title: 'Feedback that creates momentum',
    body: 'Use mentor conversations to turn uncertainty into a practical next step.',
  },
  {
    title: 'Resources with a reason',
    body: 'Know what to use, when to use it, and when to stop collecting more material.',
  },
] as const;

export const studyMaterials: StudyMaterial[] = [
  {
    id: 'iat-nest-roadmap',
    title: 'IAT & NEST preparation roadmap',
    subject: 'Strategy',
    format: 'Study guide',
    description: 'A phased map for planning concepts, practice, revision, and mock analysis.',
    driveUrl: null,
    accessNote: 'The Google Drive link will be added when this resource is published.',
    status: 'awaiting-link',
  },
  {
    id: 'physics-practice',
    title: 'Physics practice companion',
    subject: 'Physics',
    format: 'Practice set',
    description: 'Curated problem practice and review prompts for the Physics portion of your preparation.',
    driveUrl: null,
    accessNote: 'The Google Drive link will be added when this resource is published.',
    status: 'awaiting-link',
  },
  {
    id: 'chemistry-revision',
    title: 'Chemistry revision companion',
    subject: 'Chemistry',
    format: 'Revision guide',
    description: 'A concise revision layer for converting learned concepts into exam-ready recall.',
    driveUrl: null,
    accessNote: 'The Google Drive link will be added when this resource is published.',
    status: 'awaiting-link',
  },
  {
    id: 'biology-revision',
    title: 'Biology revision companion',
    subject: 'Biology',
    format: 'Revision guide',
    description: 'A structured biology revision resource for connecting chapters and strengthening retention.',
    driveUrl: null,
    accessNote: 'The Google Drive link will be added when this resource is published.',
    status: 'awaiting-link',
  },
  {
    id: 'maths-practice',
    title: 'Mathematics practice companion',
    subject: 'Mathematics',
    format: 'Practice set',
    description: 'Focused practice prompts to build accuracy, pace, and confidence in key topics.',
    driveUrl: null,
    accessNote: 'The Google Drive link will be added when this resource is published.',
    status: 'awaiting-link',
  },
];

export const books: Book[] = [
  {
    id: 'book-01',
    title: 'MentoraX Book 01',
    subtitle: 'Official title, cover, price, and purchase link to be added.',
    cover: {
      src: '/assets/books/mentorax-book-01-cover.jpg',
      alt: 'MentoraX Book 01 cover',
      status: 'awaiting-details',
    },
    price: 'TBA',
    description: 'Product information is awaiting final material from the MentoraX team.',
    purchaseUrl: null,
    status: 'awaiting-details',
  },
  {
    id: 'book-02',
    title: 'MentoraX Book 02',
    subtitle: 'Official title, cover, price, and purchase link to be added.',
    cover: {
      src: '/assets/books/mentorax-book-02-cover.jpg',
      alt: 'MentoraX Book 02 cover',
      status: 'awaiting-details',
    },
    price: 'TBA',
    description: 'Product information is awaiting final material from the MentoraX team.',
    purchaseUrl: null,
    status: 'awaiting-details',
  },
];

export const mentors: Person[] = [
  {
    id: 'raj',
    name: 'Raj',
    role: 'Founder & Mentor',
    introduction:
      'Raj co-manages MentoraX and helps shape the mentoring experience for IAT and NEST aspirants.',
    qualifications: ['Detailed qualifications awaiting confirmation.'],
    focus: ['Mentorship strategy', 'IAT & NEST preparation'],
    photo: {
      src: '/assets/mentors/raj.jpg',
      alt: 'Raj, MentoraX founder and mentor',
      status: 'awaiting-details',
    },
    status: 'awaiting-details',
  },
  {
    id: 'dipti',
    name: 'Dipti',
    role: 'Founder & Mentor',
    introduction:
      'Dipti co-manages MentoraX and helps create a thoughtful, student-centred mentorship journey.',
    qualifications: ['Detailed qualifications awaiting confirmation.'],
    focus: ['Student experience', 'IAT & NEST preparation'],
    photo: {
      src: '/assets/mentors/dipti.jpg',
      alt: 'Dipti, MentoraX founder and mentor',
      status: 'awaiting-details',
    },
    status: 'awaiting-details',
  },
  {
    id: 'mentor-03',
    name: 'Mentor 03',
    role: 'Mentor, role awaiting details',
    introduction: 'Mentor profile, subject expertise, and introduction are awaiting details from MentoraX.',
    qualifications: ['Awaiting provided details.'],
    focus: ['Awaiting provided details.'],
    photo: {
      src: '/assets/mentors/mentor-03.jpg',
      alt: 'MentoraX Mentor 03',
      status: 'awaiting-details',
    },
    status: 'awaiting-details',
  },
  {
    id: 'mentor-04',
    name: 'Mentor 04',
    role: 'Mentor, role awaiting details',
    introduction: 'Mentor profile, subject expertise, and introduction are awaiting details from MentoraX.',
    qualifications: ['Awaiting provided details.'],
    focus: ['Awaiting provided details.'],
    photo: {
      src: '/assets/mentors/mentor-04.jpg',
      alt: 'MentoraX Mentor 04',
      status: 'awaiting-details',
    },
    status: 'awaiting-details',
  },
];

export const team: Person[] = [
  {
    id: 'raj-team',
    name: 'Raj',
    role: 'Founder & Manager',
    introduction: 'Raj co-manages MentoraX and helps guide the learning experience from the inside out.',
    qualifications: ['Full founder profile awaiting confirmation.'],
    focus: ['Programme direction', 'Mentorship experience'],
    photo: {
      src: '/assets/mentors/raj.jpg',
      alt: 'Raj, MentoraX founder and manager',
      status: 'awaiting-details',
    },
    status: 'awaiting-details',
  },
  {
    id: 'dipti-team',
    name: 'Dipti',
    role: 'Founder & Manager',
    introduction: 'Dipti co-manages MentoraX with a focus on a considered, student-first experience.',
    qualifications: ['Full founder profile awaiting confirmation.'],
    focus: ['Operations', 'Student experience'],
    photo: {
      src: '/assets/mentors/dipti.jpg',
      alt: 'Dipti, MentoraX founder and manager',
      status: 'awaiting-details',
    },
    status: 'awaiting-details',
  },
  {
    id: 'team-member-03',
    name: 'Team Member 03',
    role: 'Role awaiting details',
    introduction: 'Name, role, photo, and short introduction are awaiting details from MentoraX.',
    qualifications: ['Awaiting provided details.'],
    focus: ['Awaiting provided details.'],
    photo: {
      src: '/assets/team/team-member-03.jpg',
      alt: 'MentoraX team member 03',
      status: 'awaiting-details',
    },
    status: 'awaiting-details',
  },
  {
    id: 'team-member-04',
    name: 'Team Member 04',
    role: 'Role awaiting details',
    introduction: 'Name, role, photo, and short introduction are awaiting details from MentoraX.',
    qualifications: ['Awaiting provided details.'],
    focus: ['Awaiting provided details.'],
    photo: {
      src: '/assets/team/team-member-04.jpg',
      alt: 'MentoraX team member 04',
      status: 'awaiting-details',
    },
    status: 'awaiting-details',
  },
];

export const faqs: Faq[] = [
  {
    question: 'What is MentoraX?',
    answer:
      'MentoraX is an educational mentorship platform providing mentorship, study materials, mock tests, digital books, recorded sessions, strategy sessions, and community support for competitive science entrance examinations.',
  },
  {
    question: 'Who can use MentoraX?',
    answer:
      'Users must be at least 13 years old. Students below 18 should obtain permission from a parent or guardian before purchasing paid services.',
  },
  {
    question: 'What exams does MentoraX support?',
    answer:
      'MentoraX is designed to guide students preparing for exams including IAT, IISER Admission, NEST, CUET, and other science entrance examinations.',
  },
  {
    question: 'Can I share my purchased digital books or study materials?',
    answer:
      'No. Digital products are for personal educational use only and cannot be publicly uploaded, shared on Telegram, sold, or commercially reproduced.',
  },
  {
    question: 'Are digital books refundable?',
    answer:
      'No. Digital Books, PDF Notes, Flashcards, Mock Tests, Downloaded Study Materials, and Recorded Classes are non-refundable, subject to applicable law and the stated exceptions.',
  },
  {
    question: 'When can I get a refund?',
    answer:
      'Refunds may be considered for duplicate payments, payments where an order was not created, certain cancelled mentorship sessions, or verified technical issues that permanently prevent access.',
  },
  {
    question: 'How long do approved refunds take?',
    answer:
      'Approved refunds are generally processed to the original payment method within 7–10 business days, although bank processing times may vary.',
  },
  {
    question: 'Can I reschedule a 1-to-1 mentorship session?',
    answer:
      'Yes. Students should request rescheduling at least 24 hours before the scheduled session. Missed sessions without prior notice may be treated as completed.',
  },
  {
    question: 'Does MentoraX guarantee admission or a particular rank?',
    answer:
      'No. MentoraX provides academic guidance, but admission, ranks, cutoffs, scholarships, placements, and career outcomes cannot be guaranteed.',
  },
  {
    question: 'Does MentoraX store my debit or credit card details?',
    answer:
      'No. Payment details are processed through third-party payment gateways and MentoraX does not store debit or credit card information.',
  },
  {
    question: 'What information does MentoraX collect?',
    answer:
      'Depending on your use of the platform, MentoraX may collect your name, email, mobile number, city, educational details, as well as usage information such as browser, device, IP address, analytics, and cookies.',
  },
  {
    question: 'How can I contact MentoraX?',
    answer:
      'You can contact MentoraX at managementrajiiserit@gmail.com.',
  },
];

export const contactContent = {
  route: '/contact',
  title: 'Let’s make your next step clearer.',
  intro:
    'Ask about mentorship, materials, books, or the MentoraX team. Share only the information needed for us to help.',
  form: {
    fields: ['Name', 'Email address', 'Exam focus', 'Message'],
    submitLabel: 'Send enquiry',
    privacyNote:
      'Do not share passwords, payment credentials, government ID numbers, or sensitive personal information in this form.',
  },
  officialEmail: 'managementrajiiserit@gmail.com' as string | null,
  socialLinks: [] as Array<{ label: string; href: string }>,
  responseNote: 'For questions about services, purchases, privacy, or refunds, email managementrajiiserit@gmail.com.',
} as const;

export const navigation = [
  { label: 'Home', href: '/' },
  { label: 'Mentorship', href: '/mentorship' },
  { label: 'Books', href: '/books' },
  { label: 'Mentors', href: '/mentors' },
  { label: 'Team', href: '/team' },
] as const;

export const footerNavigation = [
  ...navigation,
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Refund Policy', href: '/refund-policy' },
] as const;
