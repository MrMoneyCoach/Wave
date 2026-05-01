export type TemplateOption = {
  text: string;
  score: number;
  minChars?: number;
};

export type TemplateQuestion = {
  text: string;
  type: "single" | "multi" | "scale" | "text";
  required: boolean;
  options: TemplateOption[];
};

export type TemplateOutcome = {
  minScore: number;
  maxScore: number;
  title: string;
  description: string;
};

/** Block shape for landing pages and result pages. Mirrors the live block
 *  unions in QuizPlayer/ResultView so JSON.stringify'd blocks render directly.
 *  `score-display` is only meaningful on result pages. */
export type TemplateBlock =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3 }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "list"; items: string[]; checkmark: boolean }
  | { id: string; type: "button"; label: string; url: string; style: "primary" | "secondary" }
  | { id: string; type: "divider" }
  | {
      id: string;
      type: "score-display";
      align: "left" | "center" | "right";
      label: string;
      showBar: boolean;
    }
  | {
      id: string;
      type: "hero-split";
      headline: string;
      body: string;
      ctaLabel: string;
      ctaUrl: string;
      bullets: string[];
      imageUrl: string;
      imageAlt: string;
      imagePosition: "left" | "right";
    }
  | {
      id: string;
      type: "feature-grid";
      heading: string;
      subhead: string;
      columns: 2 | 3 | 4;
      items: { id: string; iconUrl: string; title: string; body: string }[];
    }
  | {
      id: string;
      type: "image-text";
      imageUrl: string;
      imageAlt: string;
      imagePosition: "left" | "right";
      heading: string;
      body: string;
      ctaLabel: string;
      ctaUrl: string;
    };

/** PDF body blocks support a smaller subset (no layout primitives — react-pdf
 *  doesn't render them yet). */
export type TemplatePdfBlock =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3 }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "list"; items: string[]; checkmark: boolean }
  | { id: string; type: "button"; label: string; url: string; style: "primary" | "secondary" }
  | { id: string; type: "divider" };

export type TemplateEmail = {
  subject?: string;
  greeting?: string;
  intro?: string;
  bullets?: string;
  bookingLine?: string;
  signoff?: string;
};

export type Template = {
  id: string;
  name: string;
  category: string;
  emoji: string;
  description: string;
  intro: string;
  ctaLabel: string;
  theme?: "minimal" | "card";
  /** Optional brand colour to seed the new quiz with. */
  brandColor?: string;
  /** Optional CTA label for the booking button (used in PDF + emails). */
  bookingLabel?: string;
  /** Optional landing-page blocks. When set, the new quiz's primary landing
   *  page renders these instead of the bare title/intro. */
  landingBlocks?: TemplateBlock[];
  /** Optional default result-page blocks. */
  resultBlocks?: TemplateBlock[];
  /** Optional default PDF report body blocks. */
  pdfBlocks?: TemplatePdfBlock[];
  /** Optional pre-filled email copy. */
  email?: TemplateEmail;
  questions: TemplateQuestion[];
  outcomes: TemplateOutcome[];
};

export const TEMPLATES: Template[] = [
  {
    id: "marketing-health-check",
    name: "Marketing Health Check",
    category: "Marketing",
    emoji: "📈",
    description:
      "A 6-question audit of how well your business is set up to attract, nurture and convert leads.",
    intro:
      "This 2-minute scorecard rates your marketing across audience clarity, channel performance, and measurement. You'll get a personalised result with concrete next steps.",
    ctaLabel: "Start the audit",
    questions: [
      {
        text: "Do you have a documented description of your ideal customer?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — written, shared, regularly revisited", score: 10 },
          { text: "Yes — written, but not actively used", score: 6 },
          { text: "It's in my head but nothing on paper", score: 3 },
          { text: "Not really", score: 0 },
        ],
      },
      {
        text: "How often do you review your marketing KPIs?",
        type: "single",
        required: true,
        options: [
          { text: "Weekly", score: 10 },
          { text: "Monthly", score: 6 },
          { text: "Quarterly", score: 3 },
          { text: "Rarely or never", score: 0 },
        ],
      },
      {
        text: "How many channels are actively driving qualified leads for you right now?",
        type: "single",
        required: true,
        options: [
          { text: "Three or more", score: 10 },
          { text: "Two", score: 6 },
          { text: "One", score: 3 },
          { text: "None — leads come from referrals only", score: 0 },
        ],
      },
      {
        text: "How consistent is your brand voice across email, social, and your website?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "Roughly what split do inbound vs. outbound leads sit at?",
        type: "single",
        required: true,
        options: [
          { text: "Mostly inbound (>70%)", score: 10 },
          { text: "Balanced (40–60% inbound)", score: 7 },
          { text: "Mostly outbound (>70%)", score: 4 },
          { text: "I don't track this", score: 0 },
        ],
      },
      {
        text: "Describe the single biggest marketing problem you're trying to solve right now.",
        type: "text",
        required: false,
        options: [
          { text: "≥120 chars", score: 5, minChars: 120 },
        ],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Reactive marketer",
        description:
          "Your marketing is largely reactive — leads come from word-of-mouth and ad-hoc activity. Focus first on writing down who you serve and what success looks like; that single artefact unlocks every other improvement.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Building momentum",
        description:
          "You've got the foundations in place. The next leverage point is consistency: pick one channel, commit to a weekly cadence, and review the numbers monthly. Small disciplined steps compound fast from here.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Strategic operator",
        description:
          "You're running marketing as a system, not a series of one-offs. The next step is depth: better attribution, sharper messaging tests, and a documented playbook so the engine doesn't depend on you alone.",
      },
    ],
  },

  {
    id: "website-conversion-scorecard",
    name: "Website Conversion Scorecard",
    category: "Web",
    emoji: "💻",
    description:
      "How effectively does your website turn visitors into leads and customers? 7 quick checks.",
    intro:
      "This scorecard checks your homepage and key landing pages against the fundamentals of conversion design. Most sites lose money because of the same handful of issues — let's see where yours sits.",
    ctaLabel: "Score my site",
    questions: [
      {
        text: "Is there a single, unmissable call-to-action above the fold on your homepage?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — one clear CTA, hard to miss", score: 10 },
          { text: "Yes, but it competes with other elements", score: 5 },
          { text: "There are several CTAs", score: 2 },
          { text: "There isn't really a primary CTA", score: 0 },
        ],
      },
      {
        text: "How fast does your homepage feel to load on a mobile?",
        type: "single",
        required: true,
        options: [
          { text: "Snappy — under 2 seconds", score: 10 },
          { text: "Acceptable — 2–4 seconds", score: 6 },
          { text: "Sluggish — 4+ seconds", score: 2 },
          { text: "I haven't checked", score: 0 },
        ],
      },
      {
        text: "Do you have analytics in place tracking visitor behaviour and conversions?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — analytics + heatmaps + conversion goals", score: 10 },
          { text: "Yes — analytics, but not conversion goals", score: 6 },
          { text: "Basic analytics only", score: 3 },
          { text: "Nothing meaningful", score: 0 },
        ],
      },
      {
        text: "Where on your site can a visitor leave their email?",
        type: "multi",
        required: true,
        options: [
          { text: "On the homepage", score: 3 },
          { text: "Inside blog posts or articles", score: 3 },
          { text: "On every page (sticky or footer)", score: 4 },
        ],
      },
      {
        text: "Do you show customer testimonials or case studies on key pages?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — specific results, named customers", score: 10 },
          { text: "Yes — generic testimonials", score: 5 },
          { text: "Logos of past clients only", score: 3 },
          { text: "No social proof", score: 0 },
        ],
      },
      {
        text: "How recently did you last make a change with the goal of improving conversion?",
        type: "single",
        required: true,
        options: [
          { text: "In the last month", score: 10 },
          { text: "In the last quarter", score: 7 },
          { text: "In the last year", score: 3 },
          { text: "Can't remember", score: 0 },
        ],
      },
      {
        text: "Which page on your site do you think is letting you down the most? (Why?)",
        type: "text",
        required: false,
        options: [
          { text: "≥100 chars", score: 5, minChars: 100 },
        ],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Brochure mode",
        description:
          "Your site behaves like a digital brochure — present, but not actively earning its keep. The fastest wins: one clear CTA above the fold, and an email capture on every page. You'll see results within weeks.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Working machine",
        description:
          "Your site is doing real work but there's clear headroom. Focus next on conversion goal tracking and one targeted A/B test per month — measurement turns guesses into compound improvements.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Conversion engine",
        description:
          "Your site is a serious conversion engine. The next horizon is personalisation by traffic source and continuous experimentation — small, evidence-based tweaks instead of redesigns.",
      },
    ],
  },

  {
    id: "sales-readiness-audit",
    name: "Sales Readiness Audit",
    category: "Sales",
    emoji: "🤝",
    description:
      "Are you set up to close more of the leads you already have? A 6-question diagnostic.",
    intro:
      "Most businesses don't have a lead problem — they have a follow-up problem. This audit shows you where your sales process is leaking and what to fix first.",
    ctaLabel: "Audit my sales",
    questions: [
      {
        text: "Do you have a written, repeatable sales process?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — documented and consistently followed", score: 10 },
          { text: "Documented, but inconsistently followed", score: 6 },
          { text: "It's in my head", score: 3 },
          { text: "It's mostly improvised", score: 0 },
        ],
      },
      {
        text: "How do you track every conversation with a prospect?",
        type: "single",
        required: true,
        options: [
          { text: "In a CRM — disciplined notes, dates, next steps", score: 10 },
          { text: "In a CRM — but inconsistently", score: 6 },
          { text: "Spreadsheets or notes app", score: 3 },
          { text: "Memory + email search", score: 0 },
        ],
      },
      {
        text: "What's a fair estimate of your win rate on qualified opportunities?",
        type: "single",
        required: true,
        options: [
          { text: "I know the number and it's >40%", score: 10 },
          { text: "I know the number and it's 20–40%", score: 6 },
          { text: "I know the number and it's <20%", score: 3 },
          { text: "I don't track win rate", score: 0 },
        ],
      },
      {
        text: "After a first conversation that doesn't close, how many follow-ups do you typically attempt?",
        type: "single",
        required: true,
        options: [
          { text: "Five or more, on a planned cadence", score: 10 },
          { text: "Three or four", score: 7 },
          { text: "One or two", score: 4 },
          { text: "Usually none — I wait for them", score: 0 },
        ],
      },
      {
        text: "How clearly can you articulate the unique reason a customer should pick you over the alternatives?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "What's the most common objection you get on sales calls? (How do you currently handle it?)",
        type: "text",
        required: false,
        options: [
          { text: "≥120 chars", score: 5, minChars: 120 },
        ],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Hopeful",
        description:
          "Sales is happening — but it's mostly down to luck and personality. Document the steps you already take into a simple checklist; that alone will lift your win rate noticeably within a quarter.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Methodical",
        description:
          "You've moved beyond improvisation. Your next leap comes from disciplined follow-up — the leads you already have, worked harder, will outperform any new lead-gen activity.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Repeatable",
        description:
          "You've built a system that doesn't depend on you on a good day. The next move is hiring or coaching to it — your process is mature enough to delegate.",
      },
    ],
  },

  {
    id: "brand-clarity-scorecard",
    name: "Brand Clarity Scorecard",
    category: "Brand",
    emoji: "🎯",
    description:
      "How clear is your positioning to a prospect who's never heard of you? 6 quick checks.",
    intro:
      "Confused buyers don't buy. This scorecard rates how distinctly you stand out and how easily a stranger could explain what you do.",
    ctaLabel: "Score my brand",
    questions: [
      {
        text: "Could a typical customer of yours describe what you do in a single, accurate sentence?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — and they'd all use similar language", score: 10 },
          { text: "Yes — but they'd each describe it differently", score: 5 },
          { text: "Probably not", score: 2 },
          { text: "Definitely not", score: 0 },
        ],
      },
      {
        text: "How distinct is your brand from your nearest competitor?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "Do you have a documented brand voice or tone of voice guide?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — written, used by everyone who writes for the brand", score: 10 },
          { text: "Yes — written, but rarely referenced", score: 5 },
          { text: "It's in my head", score: 2 },
          { text: "We just write things as we feel", score: 0 },
        ],
      },
      {
        text: "How consistent is your visual identity across logo, website, social, decks, and email?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "When prospects describe you, do they tend to mention specific things you stand for?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — the same handful of associations come up repeatedly", score: 10 },
          { text: "Sometimes, but it's inconsistent", score: 5 },
          { text: "Not really — they describe what we do, not what we stand for", score: 2 },
          { text: "I genuinely don't know", score: 0 },
        ],
      },
      {
        text: "In one sentence, write your unique promise to customers.",
        type: "text",
        required: false,
        options: [
          { text: "≥80 chars", score: 5, minChars: 80 },
          { text: "≥160 chars", score: 10, minChars: 160 },
        ],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Blurry",
        description:
          "Your brand reads as competent but generic. The single highest-leverage move is writing your one-sentence promise — once that exists, every other asset gets sharper around it.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Recognisable",
        description:
          "You're recognisable to the people who know you, but newcomers still have to work to get it. Tighten the language across your top three pages and you'll see a big lift in lead quality.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Iconic in your niche",
        description:
          "You've earned the rare clarity most brands don't. Protect it: every new piece of content, hire, and partner needs to reinforce — not dilute — what you already stand for.",
      },
    ],
  },

  {
    id: "content-marketing-audit",
    name: "Content Marketing Audit",
    category: "Marketing",
    emoji: "✍️",
    description:
      "Is your content actually moving the needle, or just keeping the lights on?",
    intro:
      "Lots of businesses publish; few build authority. This 6-question audit tells you which side of that line you sit on, and what to do next.",
    ctaLabel: "Audit my content",
    questions: [
      {
        text: "Do you publish on a regular, predictable schedule?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — at least weekly, no gaps in the last 6 months", score: 10 },
          { text: "Roughly monthly", score: 6 },
          { text: "Whenever inspiration strikes", score: 3 },
          { text: "Barely at all", score: 0 },
        ],
      },
      {
        text: "Do you measure content performance against business outcomes (leads, signups, revenue) — not just views?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — every piece is tied to a specific outcome", score: 10 },
          { text: "Some pieces, not all", score: 6 },
          { text: "We track engagement only", score: 3 },
          { text: "We don't really measure", score: 0 },
        ],
      },
      {
        text: "How often do you update or repurpose existing content?",
        type: "single",
        required: true,
        options: [
          { text: "Routinely — old content keeps performing", score: 10 },
          { text: "Occasionally", score: 5 },
          { text: "Rarely — we just publish new", score: 2 },
          { text: "Never", score: 0 },
        ],
      },
      {
        text: "Does each piece of content end with a clear next step for the reader?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — every piece, tailored to the topic", score: 10 },
          { text: "Most pieces", score: 6 },
          { text: "Sometimes", score: 3 },
          { text: "Almost never", score: 0 },
        ],
      },
      {
        text: "How would you rate the search visibility of your content?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "Name one piece of content you're proudest of, and what made it work.",
        type: "text",
        required: false,
        options: [
          { text: "≥150 chars", score: 5, minChars: 150 },
        ],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Broadcasting",
        description:
          "You're putting work out — but it isn't compounding. Pick one specific reader and one specific question they have, and write only for that for the next 90 days. Discipline beats volume.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Strategic",
        description:
          "You've moved past broadcasting. The next leap is treating content like product: ship, measure, iterate. Update your top-3 performers every quarter and you'll outperform competitors who only chase new.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Authority builder",
        description:
          "Your content is doing the heavy lifting other businesses pay for in ads. The next move is depth — flagship pieces and original research that establish category leadership.",
      },
    ],
  },

  {
    id: "productivity-audit",
    name: "Productivity Audit",
    category: "Personal",
    emoji: "⏱️",
    description:
      "How well-protected is your time, attention, and energy? A short, honest mirror.",
    intro:
      "Most productivity advice treats symptoms. This audit looks at the design of your week — where the inputs and outputs actually live — and tells you which lever has the highest payoff for you specifically.",
    ctaLabel: "Audit my week",
    questions: [
      {
        text: "How often do you start the day with a clear, written top three priorities?",
        type: "single",
        required: true,
        options: [
          { text: "Every day", score: 10 },
          { text: "Most days", score: 7 },
          { text: "A few times a week", score: 4 },
          { text: "Rarely", score: 0 },
        ],
      },
      {
        text: "How frequently do unplanned tasks derail your day?",
        type: "single",
        required: true,
        options: [
          { text: "Rarely — I have buffer for the unexpected", score: 10 },
          { text: "Sometimes — once or twice a week", score: 6 },
          { text: "Often — most days", score: 2 },
          { text: "Constantly — I rarely finish what I planned", score: 0 },
        ],
      },
      {
        text: "Which of these protective habits do you actually practise?",
        type: "multi",
        required: true,
        options: [
          { text: "Calendar-blocking deep work", score: 3 },
          { text: "Notifications off during focused work", score: 3 },
          { text: "A daily shutdown or review ritual", score: 2 },
          { text: "Batching shallow tasks together", score: 2 },
        ],
      },
      {
        text: "How would you rate the ratio of meetings to deep, uninterrupted work in your week?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "How often do you reach the end of the day feeling energised rather than drained?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "Describe one recurring drain on your time you'd most like to fix.",
        type: "text",
        required: false,
        options: [
          { text: "≥120 chars", score: 5, minChars: 120 },
        ],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Reactive",
        description:
          "Your week is happening to you. One change, repeated daily, will move the needle more than ten new tools: a 5-minute end-of-day review where you decide tomorrow's top three before you log off.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Intentional",
        description:
          "You've reclaimed the basics. The next layer is protection: blocking 90 uninterrupted minutes per day for the work that actually moves your business forward, and defending it ruthlessly.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Designed",
        description:
          "Your week is engineered, not endured. The remaining gains aren't about doing more — they're about doing less of what doesn't compound. Audit your meetings; ruthlessly cut.",
      },
    ],
  },
  {
    id: "lead-generation-audit",
    name: "Lead Generation Audit",
    category: "Marketing",
    emoji: "🧲",
    description:
      "Where in your funnel are leads slipping through? A 5-question diagnostic.",
    intro:
      "This scorecard maps your top-of-funnel against the four stages every working lead engine has — attract, capture, qualify, follow up — and tells you which is the weakest link.",
    ctaLabel: "Score my funnel",
    theme: "card",
    questions: [
      {
        text: "Do you know roughly how many people land on your site each week?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — I check it weekly", score: 10 },
          { text: "Roughly — I look monthly", score: 6 },
          { text: "Vaguely", score: 2 },
          { text: "No idea", score: 0 },
        ],
      },
      {
        text: "What percentage of visitors give you their email?",
        type: "single",
        required: true,
        options: [
          { text: "More than 5%", score: 10 },
          { text: "1–5%", score: 6 },
          { text: "Less than 1%", score: 2 },
          { text: "I don't track it", score: 0 },
        ],
      },
      {
        text: "How quickly is a brand new lead followed up?",
        type: "single",
        required: true,
        options: [
          { text: "Within an hour", score: 10 },
          { text: "Within a day", score: 6 },
          { text: "Within a week", score: 3 },
          { text: "Eventually, when I get to it", score: 0 },
        ],
      },
      {
        text: "Do you separate cold leads from warm ones in any structured way?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — qualified vs unqualified, with criteria", score: 10 },
          { text: "Loosely, by gut feel", score: 5 },
          { text: "Not really", score: 0 },
        ],
      },
      {
        text: "Where do you think your funnel is weakest right now?",
        type: "text",
        required: false,
        options: [{ text: "≥120 chars", score: 5, minChars: 120 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Leaky funnel",
        description:
          "You're losing leads at multiple stages. Pick the worst one (likely capture or follow-up) and fix only that for 30 days — don't try to fix the whole funnel at once.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Working funnel",
        description:
          "Your funnel converts, but the gap between 'good' and 'great' is in measurement. Add tracking on the one stage you have least visibility into.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Tuned funnel",
        description:
          "You've got a measurable, repeatable lead engine. The next horizon is segmentation — different paths for different lead types, not one-size-fits-all.",
      },
    ],
  },
  {
    id: "seo-foundations-audit",
    name: "SEO Foundations Audit",
    category: "Web",
    emoji: "🔍",
    description:
      "Are the basics that drive organic traffic actually in place? 5 quick checks.",
    intro:
      "Most SEO problems aren't algorithm problems — they're foundations problems. This scorecard checks the things that actually move the needle and will still matter in 5 years.",
    ctaLabel: "Score my SEO",
    theme: "minimal",
    questions: [
      {
        text: "Does every important page have a unique, intent-matching title tag?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — written deliberately for each page", score: 10 },
          { text: "Most pages — some duplicates", score: 5 },
          { text: "Default titles only", score: 1 },
          { text: "Not sure", score: 0 },
        ],
      },
      {
        text: "Have you done keyword research that maps to actual buyer intent?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — documented and used to plan content", score: 10 },
          { text: "Loosely — I know the obvious terms", score: 5 },
          { text: "Not really", score: 0 },
        ],
      },
      {
        text: "How many sites link back to yours?",
        type: "single",
        required: true,
        options: [
          { text: "Lots — and from relevant places", score: 10 },
          { text: "A handful", score: 5 },
          { text: "I don't know", score: 0 },
        ],
      },
      {
        text: "Is your site fast and mobile-friendly?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "Which one keyword would change your business if you ranked top 3 for it?",
        type: "text",
        required: false,
        options: [{ text: "≥30 chars", score: 5, minChars: 30 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Invisible",
        description:
          "Search engines can't tell what you're about. Start with title tags and one piece of content per buyer-intent keyword — six months of disciplined publishing changes everything.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Findable",
        description:
          "You're in the conversation. The next step is depth — pillar pages on your top three intents, with internal links pulling weight to them.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Authoritative",
        description:
          "You're in the top tier of your niche on search. Protect that position with a quarterly refresh on top performers and a steady drip of new long-tail content.",
      },
    ],
  },
  {
    id: "sales-pipeline-health",
    name: "Sales Pipeline Health",
    category: "Sales",
    emoji: "📊",
    description:
      "Is your pipeline a forecast you can trust, or just a list of names? 5 quick checks.",
    intro:
      "A healthy pipeline isn't about size — it's about predictability. This audit checks whether yours is signal or noise.",
    ctaLabel: "Audit my pipeline",
    theme: "card",
    questions: [
      {
        text: "Does every deal in your pipeline have a clear next step with a date?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — every deal, no exceptions", score: 10 },
          { text: "Most deals", score: 6 },
          { text: "Some", score: 3 },
          { text: "No — they sit there", score: 0 },
        ],
      },
      {
        text: "How accurately does your pipeline predict next quarter's revenue?",
        type: "single",
        required: true,
        options: [
          { text: "Within 10%", score: 10 },
          { text: "Within 25%", score: 6 },
          { text: "It's a guess", score: 2 },
          { text: "I don't forecast from it", score: 0 },
        ],
      },
      {
        text: "How quickly do dead deals get marked as lost (not 'paused')?",
        type: "single",
        required: true,
        options: [
          { text: "Within a clear time-out window", score: 10 },
          { text: "When I notice", score: 5 },
          { text: "Honestly, they linger forever", score: 0 },
        ],
      },
      {
        text: "Do you review your pipeline on a regular cadence?",
        type: "single",
        required: true,
        options: [
          { text: "Weekly review with action items", score: 10 },
          { text: "Monthly", score: 5 },
          { text: "Whenever I remember", score: 0 },
        ],
      },
      {
        text: "Which deal in your pipeline are you least sure about — and why?",
        type: "text",
        required: false,
        options: [{ text: "≥120 chars", score: 5, minChars: 120 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Wishful",
        description:
          "Your pipeline is hope dressed up as a list. Start with one rule: every deal has a next step and a date, or it's not in the pipeline. That alone makes forecasting possible.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Functional",
        description:
          "You can roughly see what's coming. The next leap is honest closing — kill stale deals fast, and you'll spend more time on the ones that can actually move.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Predictable",
        description:
          "Your pipeline is a real forecast. Protect that with consistent weekly reviews and resist the urge to inflate stages — discipline now compounds into trustworthy numbers.",
      },
    ],
  },
  {
    id: "visual-identity-audit",
    name: "Visual Identity Audit",
    category: "Brand",
    emoji: "🎨",
    description:
      "Is your visual identity sharp and consistent — or does it shift on every touchpoint?",
    intro:
      "A strong visual identity earns trust before a single word is read. This 5-question audit checks how much yours is doing for you.",
    ctaLabel: "Audit my visuals",
    theme: "minimal",
    questions: [
      {
        text: "Do you have a documented brand guideline (colours, fonts, logo usage)?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — actively used by everyone", score: 10 },
          { text: "Yes — but rarely opened", score: 5 },
          { text: "It's loose — I just know what 'feels right'", score: 2 },
          { text: "No documentation at all", score: 0 },
        ],
      },
      {
        text: "How consistent is your logo across website, email, social, and decks?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "Could a stranger pick your brand out of a line-up of three competitors based purely on visuals?",
        type: "single",
        required: true,
        options: [
          { text: "Easily", score: 10 },
          { text: "Probably", score: 6 },
          { text: "Maybe", score: 3 },
          { text: "Unlikely", score: 0 },
        ],
      },
      {
        text: "How current does your visual identity feel for your audience?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "What's the one visual asset (page, image, deck, etc.) you're least proud of?",
        type: "text",
        required: false,
        options: [{ text: "≥80 chars", score: 5, minChars: 80 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Inconsistent",
        description:
          "Your visuals send mixed signals — confusion costs you trust. Lock in three things first: a single logo file, a 3-colour palette, and one body font. That alone fixes 70% of consistency issues.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Cohesive",
        description:
          "You're recognisable. The next move is distinctiveness — what visual choice could only be yours? That's where memorable brands live.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Distinctive",
        description:
          "Your visual identity is doing real work. Protect it with a one-page brand guide and audit any new asset against it before it ships.",
      },
    ],
  },
  {
    id: "mobile-experience-audit",
    name: "Mobile Experience Audit",
    category: "Web",
    emoji: "📱",
    description:
      "Most of your traffic is on a phone. Is the experience built for it, or just shrunk down?",
    intro:
      "This 5-question audit checks the experience real visitors have on a mobile screen — not just whether the site renders, but whether it actually works.",
    ctaLabel: "Audit my mobile site",
    theme: "card",
    questions: [
      {
        text: "When was the last time you opened your own site on your phone, end-to-end, like a real visitor?",
        type: "single",
        required: true,
        options: [
          { text: "Within the last week", score: 10 },
          { text: "Within the last month", score: 6 },
          { text: "Months ago", score: 2 },
          { text: "Honestly, I don't really do that", score: 0 },
        ],
      },
      {
        text: "How easy is it to tap your primary call-to-action without zooming?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "How long does the mobile homepage take to feel usable?",
        type: "single",
        required: true,
        options: [
          { text: "Instant — under 2 seconds", score: 10 },
          { text: "Quick — 2–4 seconds", score: 6 },
          { text: "Sluggish — 4+ seconds", score: 2 },
          { text: "I have never timed it", score: 0 },
        ],
      },
      {
        text: "Are forms (signup, enquiry, checkout) easy to complete on a phone with one thumb?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — short, native keyboards, autofill", score: 10 },
          { text: "Mostly — a few rough edges", score: 6 },
          { text: "Painful — small fields, no autofill", score: 2 },
          { text: "I haven't tried", score: 0 },
        ],
      },
      {
        text: "Describe the worst friction point you'd hit if you were buying from your own site on a phone.",
        type: "text",
        required: false,
        options: [{ text: "≥120 chars", score: 5, minChars: 120 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Desktop-first",
        description:
          "Your site is built for the smaller share of your audience. Spend an afternoon testing on a real phone and fix the top three friction points — that's a measurable revenue lift, not a vanity exercise.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Mobile-friendly",
        description:
          "Your site works on a phone, which puts you ahead. The next step is mobile-first: design and test the smallest screen first, then scale up.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Mobile-first",
        description:
          "You treat the phone as the primary surface. Keep the discipline — every new feature should be designed for thumbs first, mouse second.",
      },
    ],
  },
  {
    id: "customer-retention-score",
    name: "Customer Retention Score",
    category: "Sales",
    emoji: "♻️",
    description:
      "It's cheaper to keep a customer than to find a new one. Are you actually doing it?",
    intro:
      "This scorecard rates how well your business holds onto customers after the first sale — and points to the highest-leverage retention move you're missing.",
    ctaLabel: "Score my retention",
    theme: "minimal",
    questions: [
      {
        text: "Do you know your churn rate (or repeat-purchase rate)?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — I track it monthly", score: 10 },
          { text: "Roughly", score: 5 },
          { text: "Not really", score: 0 },
        ],
      },
      {
        text: "How structured is your post-sale onboarding for a new customer?",
        type: "single",
        required: true,
        options: [
          { text: "Documented sequence with milestones", score: 10 },
          { text: "Loose checklist, mostly followed", score: 6 },
          { text: "Ad-hoc — depends who's helping", score: 2 },
          { text: "There isn't really one", score: 0 },
        ],
      },
      {
        text: "How often do you proactively check in with existing customers (not for renewal/upsell)?",
        type: "single",
        required: true,
        options: [
          { text: "Quarterly or more often", score: 10 },
          { text: "Once or twice a year", score: 5 },
          { text: "Only when something goes wrong", score: 0 },
        ],
      },
      {
        text: "Do you have a clear way to capture and act on customer feedback?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — surveys + interviews + a process", score: 10 },
          { text: "Surveys only", score: 5 },
          { text: "We listen ad-hoc when it comes up", score: 2 },
          { text: "No real channel", score: 0 },
        ],
      },
      {
        text: "Which customer have you lost that you wish you hadn't — and why?",
        type: "text",
        required: false,
        options: [{ text: "≥120 chars", score: 5, minChars: 120 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Bucket with holes",
        description:
          "You're filling the bucket faster than you can plug holes. Pick one segment of customers and run a small onboarding sequence for them this quarter — measure the impact, then expand.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Holding the line",
        description:
          "You've reduced obvious leakage. The next leap is proactive — scheduled check-ins and a structured way to listen, so you spot risk before customers churn.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Compounding",
        description:
          "Retention is a real engine for you. The next horizon is expansion — turning the strongest customer relationships into referrals and case studies that compound into more wins.",
      },
    ],
  },
  {
    id: "differentiation-check",
    name: "Differentiation Check",
    category: "Brand",
    emoji: "✨",
    description:
      "If a prospect put you next to a competitor, would the difference be obvious?",
    intro:
      "Differentiation isn't about being better — it's about being unmistakably different. This check tells you whether yours holds up under scrutiny.",
    ctaLabel: "Check my edge",
    theme: "card",
    questions: [
      {
        text: "Could you finish this sentence in one specific phrase: 'We're the only ones who…'?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — sharp, specific, true", score: 10 },
          { text: "Yes — but it's a bit generic", score: 5 },
          { text: "It's vague", score: 2 },
          { text: "Honestly, no", score: 0 },
        ],
      },
      {
        text: "How different is your offer from your closest competitor's, on substance?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "How different is your messaging from your closest competitor's, side-by-side?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "Do prospects regularly ask 'how is this different from X?'",
        type: "single",
        required: true,
        options: [
          { text: "Rarely — the difference is obvious", score: 10 },
          { text: "Sometimes — and we have a good answer", score: 6 },
          { text: "Often — and we struggle to answer", score: 2 },
          { text: "Constantly", score: 0 },
        ],
      },
      {
        text: "Write the one-sentence reason a customer should pick you over the obvious alternative.",
        type: "text",
        required: false,
        options: [
          { text: "≥80 chars", score: 5, minChars: 80 },
          { text: "≥160 chars", score: 10, minChars: 160 },
        ],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Same as everyone",
        description:
          "Right now you compete on price and effort. The fastest way out is to pick one thing you do differently — even a small one — and lean into it everywhere for 90 days.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Visibly different",
        description:
          "Prospects can tell you apart, given enough attention. The next move is making the difference visible at first glance — your homepage hero, your one-line bio, your email signature.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Category of one",
        description:
          "You've earned a position no one else can copy easily. Defend it with consistency: the same words, the same promises, repeated everywhere.",
      },
    ],
  },
  {
    id: "energy-and-focus-audit",
    name: "Energy & Focus Audit",
    category: "Personal",
    emoji: "🔋",
    description:
      "Your output isn't capped by hours — it's capped by attention. How well do you protect yours?",
    intro:
      "This audit looks at the conditions you create for deep work and the small habits that drain or restore focus. Honest answers, useful result.",
    ctaLabel: "Audit my focus",
    theme: "minimal",
    questions: [
      {
        text: "How many uninterrupted 90-minute focus blocks did you have in the last working week?",
        type: "single",
        required: true,
        options: [
          { text: "Five or more", score: 10 },
          { text: "Two to four", score: 6 },
          { text: "One", score: 3 },
          { text: "Zero", score: 0 },
        ],
      },
      {
        text: "Which of these do you actually do during focus time?",
        type: "multi",
        required: true,
        options: [
          { text: "Phone in another room or do-not-disturb on", score: 3 },
          { text: "Browser notifications off", score: 2 },
          { text: "Slack/Teams closed", score: 3 },
          { text: "Single tab / single window", score: 2 },
        ],
      },
      {
        text: "How clear are you on what 'most important work' looks like for you this quarter?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "How would you rate your sleep on a typical work night?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "What's the one habit you suspect would change your focus most if you started — or stopped?",
        type: "text",
        required: false,
        options: [{ text: "≥100 chars", score: 5, minChars: 100 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Scattered",
        description:
          "Your attention is being spent in lots of small change. The cheapest fix that works: one 90-minute focus block, same time every day, phone in another room. Six weeks of that changes the conversation.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Focused",
        description:
          "You can find focus when you need it. The next layer is making it the default — protecting at least one block daily without asking permission.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Compounding",
        description:
          "Your focus is an asset, not an accident. Don't add anything; subtract. The biggest gains from here come from cutting commitments, not stacking new habits.",
      },
    ],
  },
  {
    id: "decision-making-audit",
    name: "Decision-Making Audit",
    category: "Personal",
    emoji: "🧭",
    description:
      "Are your decisions getting better, or just faster? A 5-question check.",
    intro:
      "Most people don't have a decision problem — they have a process problem. This audit looks at how you actually make the calls that matter, and where the predictable mistakes come in.",
    ctaLabel: "Audit my decisions",
    theme: "card",
    questions: [
      {
        text: "Before a meaningful decision, do you write down what you're choosing between and why?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — every important call", score: 10 },
          { text: "Sometimes", score: 5 },
          { text: "Rarely", score: 2 },
          { text: "Never", score: 0 },
        ],
      },
      {
        text: "How often do you go back and review past decisions to learn from them?",
        type: "single",
        required: true,
        options: [
          { text: "On a regular cadence", score: 10 },
          { text: "Occasionally", score: 5 },
          { text: "Almost never", score: 0 },
        ],
      },
      {
        text: "How comfortable are you sitting with a decision unmade for longer than feels comfortable?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "How often do you actively seek input that disagrees with you before deciding?",
        type: "single",
        required: true,
        options: [
          { text: "Routinely — on anything significant", score: 10 },
          { text: "Sometimes", score: 5 },
          { text: "Rarely — I trust my read", score: 1 },
          { text: "Never", score: 0 },
        ],
      },
      {
        text: "Describe a recent decision you regret — what would you change about how you made it?",
        type: "text",
        required: false,
        options: [{ text: "≥120 chars", score: 5, minChars: 120 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Reactive",
        description:
          "You decide on instinct, which gets you moving but limits how much you learn. The single highest-leverage habit: a one-line decision journal — what you chose, why, and what you expect. Six months in, the patterns become obvious.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Considered",
        description:
          "You've moved past pure instinct. The next leap is actively inviting disagreement before you decide — the cost is small, the upside is large.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Disciplined",
        description:
          "You decide deliberately and learn from outcomes. Defend the process — under pressure is exactly when you'll be tempted to skip steps, and exactly when those steps matter most.",
      },
    ],
  },
  {
    id: "manager-readiness",
    name: "Manager Readiness",
    category: "Leadership",
    emoji: "🪜",
    description:
      "Are you building a team you can grow with — or one you have to hold up?",
    intro:
      "This scorecard maps the practices that distinguish managers people thrive under from ones they merely tolerate. 5 minutes, useful answers.",
    ctaLabel: "Score my management",
    theme: "minimal",
    questions: [
      {
        text: "Do you have regular 1:1s with every direct report, on a predictable cadence?",
        type: "single",
        required: true,
        options: [
          { text: "Weekly or fortnightly, never cancelled", score: 10 },
          { text: "Monthly or sporadic", score: 5 },
          { text: "Only when something needs discussing", score: 2 },
          { text: "Not really", score: 0 },
        ],
      },
      {
        text: "How clearly does each person on your team know what success looks like for them this quarter?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "When was the last time you gave specific developmental feedback to someone who reports to you?",
        type: "single",
        required: true,
        options: [
          { text: "This week", score: 10 },
          { text: "This month", score: 6 },
          { text: "This quarter", score: 3 },
          { text: "Can't remember", score: 0 },
        ],
      },
      {
        text: "How comfortable are you having a hard conversation early — before a small issue grows?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "Where on your team do you feel under-equipped right now — and what would help?",
        type: "text",
        required: false,
        options: [{ text: "≥120 chars", score: 5, minChars: 120 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Player-coach",
        description:
          "You're carrying a lot personally. The single most leveraged thing you can do this month is protect a weekly 1:1 with everyone who reports to you — that ritual creates the surface area for everything else to improve.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Solid manager",
        description:
          "Your team knows where they stand. The next step is feedback frequency — small, specific notes given quickly, not big set-piece reviews.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Multiplier",
        description:
          "You're making your team better, not just busier. The next horizon is your peers — the leadership skills that scaled a team also scale across the organisation.",
      },
    ],
  },
  {
    id: "team-culture-audit",
    name: "Team Culture Audit",
    category: "Leadership",
    emoji: "🤲",
    description:
      "Culture isn't your values poster — it's what people do when no one's watching.",
    intro:
      "This audit checks whether your team's day-to-day behaviour matches what you'd say your culture is. 5 quick, candid questions.",
    ctaLabel: "Audit my culture",
    theme: "card",
    questions: [
      {
        text: "How safe is it for someone on your team to disagree with you in a meeting?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "When mistakes happen, what's the typical response on your team?",
        type: "single",
        required: true,
        options: [
          { text: "We discuss what to learn and adjust", score: 10 },
          { text: "We move on quickly", score: 5 },
          { text: "Someone gets blamed", score: 1 },
          { text: "It depends who made the mistake", score: 0 },
        ],
      },
      {
        text: "How clearly does the team know the top priority right now — versus all the other things in flight?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "How often do people on your team thank or acknowledge each other unprompted?",
        type: "single",
        required: true,
        options: [
          { text: "Constantly — it's part of how we work", score: 10 },
          { text: "Now and then", score: 5 },
          { text: "Rarely", score: 0 },
        ],
      },
      {
        text: "What's one thing about how your team works that you'd quietly like to change?",
        type: "text",
        required: false,
        options: [{ text: "≥120 chars", score: 5, minChars: 120 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Compliance culture",
        description:
          "Your team is doing the work but isn't bringing its best. The single most powerful unlock: respond to the next mistake with curiosity instead of correction. Your team will learn the new rule fast.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Healthy team",
        description:
          "People show up well. The next move is sharper priority — when everything matters, nothing does. One agreed top priority per quarter, repeated relentlessly.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "High-trust team",
        description:
          "You've built rare conditions. Protect them — culture decays one tolerated behaviour at a time, and shows up most clearly in how you handle the next hard moment.",
      },
    ],
  },
  {
    id: "communication-clarity-check",
    name: "Communication Clarity Check",
    category: "Leadership",
    emoji: "📣",
    description:
      "Are your messages landing — or being heard, nodded at, and quietly misinterpreted?",
    intro:
      "Most communication problems aren't about volume — they're about clarity, timing, and channel. This scorecard helps you see where yours fall over.",
    ctaLabel: "Check my comms",
    theme: "minimal",
    questions: [
      {
        text: "Before sending a long email or message, do you ask yourself 'what's the single thing the reader needs to do or know'?",
        type: "single",
        required: true,
        options: [
          { text: "Always", score: 10 },
          { text: "Usually", score: 6 },
          { text: "Sometimes", score: 3 },
          { text: "Rarely", score: 0 },
        ],
      },
      {
        text: "How often do people come back to you needing clarification on something you'd already explained?",
        type: "single",
        required: true,
        options: [
          { text: "Rarely", score: 10 },
          { text: "Now and then", score: 5 },
          { text: "Most weeks", score: 2 },
          { text: "Constantly", score: 0 },
        ],
      },
      {
        text: "How well-matched is the channel you use to the type of message (e.g. async vs synchronous)?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "When you give an update or instruction, do you check what the other person took away from it?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — most of the time", score: 10 },
          { text: "Sometimes", score: 5 },
          { text: "Rarely", score: 0 },
        ],
      },
      {
        text: "Describe a recent message that didn't land the way you intended — and what you'd change.",
        type: "text",
        required: false,
        options: [{ text: "≥120 chars", score: 5, minChars: 120 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Sender mode",
        description:
          "You communicate; the question is whether it lands. Start every important message with one sentence that names what you want the reader to do or know. Everything else is supporting evidence.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Clear",
        description:
          "Your messages mostly land. The next step is the closing of the loop — short check-back questions to confirm what the other person took away.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Surgical",
        description:
          "Your communication is precise. Keep it that way — when work gets busy, comms is the first thing to bloat. Less words, sharper structure.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // FINANCE — fully ready-made templates (landing, result, PDF, email all set)
  // ---------------------------------------------------------------------------
  {
    id: "financial-wellbeing-scorecard",
    name: "Financial Wellbeing Scorecard",
    category: "Finance",
    emoji: "💷",
    description:
      "Where do you stand across spending, saving, investing, protection and planning? A 7-question audit with a personalised PDF report.",
    intro:
      "This 3-minute scorecard rates your financial wellbeing across the five areas that drive long-term security. You'll get a personalised result and a PDF with concrete next steps.",
    ctaLabel: "Start the scorecard",
    theme: "card",
    brandColor: "#1e3a8a",
    bookingLabel: "Book your free clarity call",
    email: {
      subject: "Your Financial Wellbeing Scorecard results",
      greeting: "Hi {{firstName}},",
      intro:
        "Thank you for completing the Financial Wellbeing Scorecard. Your personalised report is attached as a PDF.\n\nYou scored {{percent}}% — {{outcomeTitle}}.",
      bullets:
        "Where you're already strong\nWhere you have room to grow\nThe single most important next step",
      bookingLine:
        "Want to walk through your result with me one-to-one? Book a no-obligation 30-minute clarity call.",
      signoff: "Looking forward to chatting,\n— {{ownerName}}",
    },
    landingBlocks: [
      {
        id: "hero",
        type: "hero-split",
        headline: "How financially well are you, really?",
        body: "A 3-minute scorecard that rates your spending, saving, investing, protection and planning. You'll get a personalised PDF report and a clear next step.",
        ctaLabel: "Take the scorecard",
        ctaUrl: "#start",
        bullets: [
          "Five-area, 7-question audit",
          "Personalised PDF report sent by email",
          "Free no-pressure clarity call afterwards",
        ],
        imageUrl: "",
        imageAlt: "",
        imagePosition: "right",
      },
      {
        id: "features",
        type: "feature-grid",
        heading: "What you'll learn",
        subhead:
          "Most people we work with assume their finances are 'fine' — until they see them mapped out across all five areas.",
        columns: 3,
        items: [
          {
            id: "f1",
            iconUrl: "",
            title: "Where you're strong",
            body: "The areas you've already nailed, so we don't waste time on what isn't broken.",
          },
          {
            id: "f2",
            iconUrl: "",
            title: "Hidden gaps",
            body: "The blind spots — usually around protection or estate planning — that catch most people out.",
          },
          {
            id: "f3",
            iconUrl: "",
            title: "Your single next step",
            body: "One concrete action that makes the biggest difference for someone in your position.",
          },
        ],
      },
    ],
    resultBlocks: [
      {
        id: "score",
        type: "score-display",
        align: "center",
        label: "Your Financial Wellbeing score",
        showBar: true,
      },
      { id: "h1", type: "heading", text: "{{outcomeTitle}}", level: 2 },
      { id: "p1", type: "paragraph", text: "{{outcomeDescription}}" },
      { id: "div1", type: "divider" },
      { id: "h2", type: "heading", text: "What good looks like", level: 3 },
      {
        id: "list",
        type: "list",
        checkmark: true,
        items: [
          "An emergency fund of 3–6 months of essential outgoings",
          "Pension contributions of at least 12–15% of gross income",
          "An up-to-date will and a registered power of attorney",
          "Income protection covering at least 60% of take-home pay",
          "A long-term plan reviewed at least once a year",
        ],
      },
      {
        id: "cta",
        type: "button",
        label: "Book your free clarity call →",
        url: "",
        style: "primary",
      },
    ],
    pdfBlocks: [
      {
        id: "h1",
        type: "heading",
        text: "Your Financial Wellbeing report",
        level: 1,
      },
      {
        id: "p1",
        type: "paragraph",
        text: "Hi {{firstName}}, thank you for taking the time to complete the Financial Wellbeing Scorecard. Below is a brief interpretation of your result and a checklist of where most people in your position go next.",
      },
      {
        id: "h2",
        type: "heading",
        text: "Your result: {{outcomeTitle}}",
        level: 2,
      },
      { id: "p2", type: "paragraph", text: "{{outcomeDescription}}" },
      { id: "h3", type: "heading", text: "Your next-step checklist", level: 3 },
      {
        id: "checklist",
        type: "list",
        checkmark: true,
        items: [
          "Confirm you have an emergency fund covering 3–6 months of essential outgoings",
          "Check pension contributions are at least 12–15% of gross income",
          "Make sure you have an up-to-date will and a registered power of attorney",
          "Review your income-protection cover (target: 60%+ of take-home pay)",
          "Schedule an annual financial review with a regulated adviser",
        ],
      },
    ],
    questions: [
      {
        text: "Do you have an emergency fund covering 3–6 months of essential outgoings?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — held in an easy-access account", score: 10 },
          { text: "Some savings but not 3 months' worth", score: 5 },
          { text: "Less than a month, or none", score: 0 },
        ],
      },
      {
        text: "How much of your gross income are you putting into a pension or long-term investments each month?",
        type: "single",
        required: true,
        options: [
          { text: "15% or more", score: 10 },
          { text: "Between 8 and 15%", score: 7 },
          { text: "Less than 8%", score: 3 },
          { text: "Nothing right now", score: 0 },
        ],
      },
      {
        text: "Do you have an up-to-date will and a registered power of attorney?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — both, reviewed in the last 3 years", score: 10 },
          { text: "I have a will but no power of attorney", score: 5 },
          { text: "Neither, or both are out of date", score: 0 },
        ],
      },
      {
        text: "If you couldn't work for 6 months due to illness, would you still be able to cover your essential outgoings?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — through income protection or savings", score: 10 },
          { text: "Probably for a few months, then it would get tight", score: 5 },
          { text: "No — I'd be in real trouble within weeks", score: 0 },
        ],
      },
      {
        text: "How clear are you on what 'enough' looks like for you in retirement (income, lifestyle, when)?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "When did you last sit down with someone independent to review your overall financial plan?",
        type: "single",
        required: true,
        options: [
          { text: "Within the last 12 months", score: 10 },
          { text: "1–3 years ago", score: 5 },
          { text: "More than 3 years ago, or never", score: 0 },
        ],
      },
      {
        text: "What's the single biggest financial worry on your mind right now? (optional — helps me prepare if you book a call)",
        type: "text",
        required: false,
        options: [{ text: "≥80 chars", score: 5, minChars: 80 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Exposed",
        description:
          "There are some significant gaps in your current setup — most likely around protection or planning — that could hit hard if life threw you a curveball. The good news: a single conversation usually surfaces the two or three highest-impact moves to make first.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Building",
        description:
          "You've got the basics in place but there's meaningful room to tighten the plan. Most people in this band benefit from clarifying their long-term goal first, then working back to a contribution and protection plan that actually gets them there.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "On track",
        description:
          "You're doing the hard things well. From here it's about staying disciplined, optimising tax wrappers, and making sure your plan keeps pace with life changes. A regular annual review is usually all that's needed.",
      },
    ],
  },

  {
    id: "retirement-readiness-score",
    name: "Retirement Readiness Score",
    category: "Finance",
    emoji: "🏖️",
    description:
      "Are you on track to retire when you want — and to live the lifestyle you've planned for? An 8-question check with a personalised report.",
    intro:
      "Most people don't know if they're on track for retirement until it's almost too late to course-correct. This 4-minute scorecard gives you a clear answer and a personalised PDF.",
    ctaLabel: "Check my readiness",
    theme: "card",
    brandColor: "#0d9488",
    bookingLabel: "Book your retirement clarity call",
    email: {
      subject: "Your Retirement Readiness Score",
      greeting: "Hi {{firstName}},",
      intro:
        "Thanks for completing the Retirement Readiness Score. Your personalised PDF is attached.\n\nYou scored {{percent}}% — {{outcomeTitle}}.",
      bullets:
        "How realistic your current pace is\nThe single biggest risk to your plan\nWhat someone in your position usually does next",
      bookingLine:
        "Want to talk through your result? Book a free 30-minute call — no pressure, no jargon.",
      signoff: "Speak soon,\n— {{ownerName}}",
    },
    landingBlocks: [
      {
        id: "hero",
        type: "hero-split",
        headline: "Are you actually on track to retire when you want?",
        body: "An 8-question, 4-minute readiness check across savings rate, pension pots, tax position and risk. You'll get a personalised PDF and a clear next step.",
        ctaLabel: "Check my readiness",
        ctaUrl: "#start",
        bullets: [
          "Built for people 10+ years from retirement",
          "Personalised PDF emailed straight to you",
          "Optional free clarity call afterwards",
        ],
        imageUrl: "",
        imageAlt: "",
        imagePosition: "right",
      },
      {
        id: "features",
        type: "feature-grid",
        heading: "Why this matters",
        subhead:
          "Small course-corrections made 10 years out are worth ten times the same change made 1 year out. The earlier you know where you stand, the easier it is to fix.",
        columns: 3,
        items: [
          {
            id: "f1",
            iconUrl: "",
            title: "Honest answer",
            body: "Not 'looks fine' — a numerical readiness score and what it really means.",
          },
          {
            id: "f2",
            iconUrl: "",
            title: "Pension consolidation",
            body: "Most people lose track of pots after 2 job changes. We'll flag whether yours need rounding up.",
          },
          {
            id: "f3",
            iconUrl: "",
            title: "Sequence-of-returns risk",
            body: "The most under-discussed risk for anyone within 5 years of stopping work.",
          },
        ],
      },
    ],
    resultBlocks: [
      {
        id: "score",
        type: "score-display",
        align: "center",
        label: "Your Retirement Readiness score",
        showBar: true,
      },
      { id: "h1", type: "heading", text: "{{outcomeTitle}}", level: 2 },
      { id: "p1", type: "paragraph", text: "{{outcomeDescription}}" },
      { id: "div1", type: "divider" },
      { id: "h2", type: "heading", text: "Your priority list", level: 3 },
      {
        id: "list",
        type: "list",
        checkmark: true,
        items: [
          "Get a clear annual income target for retirement",
          "Round up every pension pot you've ever contributed to",
          "Stress-test your plan against a 25% market drop near retirement",
          "Confirm your investment risk matches your time horizon",
          "Check your tax-efficient drawdown plan",
        ],
      },
      {
        id: "cta",
        type: "button",
        label: "Book your retirement clarity call →",
        url: "",
        style: "primary",
      },
    ],
    pdfBlocks: [
      {
        id: "h1",
        type: "heading",
        text: "Your Retirement Readiness report",
        level: 1,
      },
      {
        id: "p1",
        type: "paragraph",
        text: "Hi {{firstName}}, here's a brief interpretation of your readiness score and the actions most useful for someone in your position.",
      },
      {
        id: "h2",
        type: "heading",
        text: "Your result: {{outcomeTitle}}",
        level: 2,
      },
      { id: "p2", type: "paragraph", text: "{{outcomeDescription}}" },
      { id: "h3", type: "heading", text: "Your priority list", level: 3 },
      {
        id: "checklist",
        type: "list",
        checkmark: true,
        items: [
          "Define a clear annual income target for retirement",
          "Round up every pension pot from previous jobs",
          "Stress-test against a 25% market drop near retirement",
          "Confirm your investment risk matches your time horizon",
          "Build a tax-efficient drawdown plan",
        ],
      },
    ],
    questions: [
      {
        text: "Do you know roughly how much annual income you'll want in retirement?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — to within £5k", score: 10 },
          { text: "I have a rough range", score: 6 },
          { text: "No idea", score: 0 },
        ],
      },
      {
        text: "How would you describe your current pension contribution rate?",
        type: "single",
        required: true,
        options: [
          { text: "Above 15% of gross income", score: 10 },
          { text: "Around 10–15%", score: 7 },
          { text: "Just the auto-enrolment minimum", score: 3 },
          { text: "Not currently contributing", score: 0 },
        ],
      },
      {
        text: "Have you had a forecast showing when your money would actually run out at your current pace?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — within the last 2 years", score: 10 },
          { text: "Years ago, but not since", score: 5 },
          { text: "Never", score: 0 },
        ],
      },
      {
        text: "Do you have a clear view of all the pension pots you've accumulated across previous jobs?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — all consolidated or tracked", score: 10 },
          { text: "Most of them — one or two unaccounted for", score: 5 },
          { text: "No idea where the older ones are", score: 0 },
        ],
      },
      {
        text: "How comfortable are you with the level of investment risk in your retirement money?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "Do you understand how your retirement income will be taxed when you start drawing it?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — fully", score: 10 },
          { text: "The basics, but not the optimisation", score: 5 },
          { text: "No", score: 0 },
        ],
      },
      {
        text: "If markets fell 25% the year before you wanted to retire, what would you do?",
        type: "single",
        required: true,
        options: [
          { text: "Stick with the plan — I'd already have a buffer", score: 10 },
          { text: "Delay retirement by a year or two", score: 5 },
          { text: "Panic and reach out to someone urgently", score: 0 },
        ],
      },
      {
        text: "Optional — what's the lifestyle you're picturing for retirement?",
        type: "text",
        required: false,
        options: [{ text: "≥100 chars", score: 5, minChars: 100 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Off-track",
        description:
          "At your current pace, the retirement you want and the retirement you're funding aren't the same thing yet. The gap is usually closeable but the longer you leave it, the harder the maths gets. The single highest-impact action is almost always defining the income target first — everything else flows from that.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "On the road",
        description:
          "You're doing more than most. The gaps tend to be around pension consolidation, tax efficiency, or risk levels that don't match your time horizon. A 30-minute review usually pays for itself many times over from this band.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "On schedule",
        description:
          "You're in good shape. Focus shifts to optimisation: tax-efficient drawdown, sequence-of-returns risk, and making sure the plan still matches the lifestyle you actually want — not the one you set out for 10 years ago.",
      },
    ],
  },

  {
    id: "wealth-protection-audit",
    name: "Wealth Protection Audit",
    category: "Finance",
    emoji: "🛡️",
    description:
      "How well protected are you and the people you love against death, illness and the taxman? A 7-question audit.",
    intro:
      "Most people pay close attention to growing their wealth and almost no attention to protecting it. This 3-minute audit shows you where the dangerous gaps are.",
    ctaLabel: "Audit my protection",
    theme: "card",
    brandColor: "#15803d",
    bookingLabel: "Book your protection review",
    email: {
      subject: "Your Wealth Protection Audit results",
      greeting: "Hi {{firstName}},",
      intro:
        "Thanks for completing the Wealth Protection Audit. Your personalised PDF report is attached.\n\nYou scored {{percent}}% — {{outcomeTitle}}.",
      bullets:
        "The gaps that would hurt most\nWhat you've already done well\nThe one thing to fix first",
      bookingLine:
        "Want to walk through your result? Book a free 30-minute review with no obligation.",
      signoff: "Talk soon,\n— {{ownerName}}",
    },
    landingBlocks: [
      {
        id: "hero",
        type: "hero-split",
        headline: "What happens to your family if life doesn't go to plan?",
        body: "A 3-minute audit across life cover, income protection, critical illness, IHT and estate planning. Personalised PDF, plain English, no jargon.",
        ctaLabel: "Audit my protection",
        ctaUrl: "#start",
        bullets: [
          "Covers the 5 areas that matter most",
          "Personalised PDF emailed within minutes",
          "Optional free 30-minute review",
        ],
        imageUrl: "",
        imageAlt: "",
        imagePosition: "right",
      },
      {
        id: "features",
        type: "feature-grid",
        heading: "What we'll look at",
        subhead: "",
        columns: 3,
        items: [
          {
            id: "f1",
            iconUrl: "",
            title: "Income protection",
            body: "If you couldn't work for a year, would your family still be OK?",
          },
          {
            id: "f2",
            iconUrl: "",
            title: "Estate & IHT",
            body: "Without a plan, HMRC can take 40% of what you leave behind.",
          },
          {
            id: "f3",
            iconUrl: "",
            title: "Critical illness",
            body: "1 in 2 of us will face a serious illness. Most aren't covered for the financial fallout.",
          },
        ],
      },
    ],
    resultBlocks: [
      {
        id: "score",
        type: "score-display",
        align: "center",
        label: "Your Protection score",
        showBar: true,
      },
      { id: "h1", type: "heading", text: "{{outcomeTitle}}", level: 2 },
      { id: "p1", type: "paragraph", text: "{{outcomeDescription}}" },
      { id: "div1", type: "divider" },
      { id: "h2", type: "heading", text: "Your protection checklist", level: 3 },
      {
        id: "list",
        type: "list",
        checkmark: true,
        items: [
          "Life cover at least 10× your annual income",
          "Income protection covering 60%+ of your take-home pay",
          "Critical illness cover for any major dependants",
          "An up-to-date will and registered power of attorney",
          "An IHT plan if your estate is likely to exceed thresholds",
        ],
      },
      {
        id: "cta",
        type: "button",
        label: "Book your protection review →",
        url: "",
        style: "primary",
      },
    ],
    pdfBlocks: [
      {
        id: "h1",
        type: "heading",
        text: "Your Wealth Protection report",
        level: 1,
      },
      {
        id: "p1",
        type: "paragraph",
        text: "Hi {{firstName}}, here's a brief interpretation of your protection audit and the steps most worth taking next.",
      },
      {
        id: "h2",
        type: "heading",
        text: "Your result: {{outcomeTitle}}",
        level: 2,
      },
      { id: "p2", type: "paragraph", text: "{{outcomeDescription}}" },
      { id: "h3", type: "heading", text: "Your protection checklist", level: 3 },
      {
        id: "checklist",
        type: "list",
        checkmark: true,
        items: [
          "Life cover at least 10× your annual income",
          "Income protection covering 60%+ of your take-home pay",
          "Critical illness cover for major dependants",
          "An up-to-date will and registered power of attorney",
          "An IHT plan if your estate is likely to exceed thresholds",
        ],
      },
    ],
    questions: [
      {
        text: "Do you have life insurance worth at least 10× your annual income?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — and it's in trust", score: 10 },
          { text: "Yes, but not in trust", score: 7 },
          { text: "Some cover, but less than 10×", score: 3 },
          { text: "No life cover", score: 0 },
        ],
      },
      {
        text: "Do you have income protection that would replace at least 60% of your take-home pay if you couldn't work?",
        type: "single",
        required: true,
        options: [
          { text: "Yes", score: 10 },
          { text: "I have some short-term cover (employer or otherwise)", score: 5 },
          { text: "No", score: 0 },
        ],
      },
      {
        text: "Do you have critical illness cover?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — for me and my partner", score: 10 },
          { text: "Yes, just me", score: 6 },
          { text: "No", score: 0 },
        ],
      },
      {
        text: "Do you have an up-to-date will?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — reviewed in the last 3 years", score: 10 },
          { text: "Yes, but it's older than that", score: 5 },
          { text: "No will in place", score: 0 },
        ],
      },
      {
        text: "Do you have a registered Lasting Power of Attorney (financial and/or health)?",
        type: "single",
        required: true,
        options: [
          { text: "Both registered", score: 10 },
          { text: "One of them", score: 5 },
          { text: "Neither", score: 0 },
        ],
      },
      {
        text: "Do you know whether your estate is likely to face Inheritance Tax — and have you done anything about it?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — and we have an active plan", score: 10 },
          { text: "Yes — but no plan in place", score: 4 },
          { text: "Haven't checked", score: 0 },
        ],
      },
      {
        text: "Optional — what's the most important thing you'd want to know your money has done for your family?",
        type: "text",
        required: false,
        options: [{ text: "≥80 chars", score: 5, minChars: 80 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Exposed",
        description:
          "There are real gaps that could cause significant hardship for the people you love. Most can be closed in a few hours of work — but only if you actually do them. Start with whichever of life cover, income protection or a will is missing.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Partly covered",
        description:
          "You've taken some good steps but the picture isn't complete. The most common gaps in this band are income protection, critical illness, or a will that hasn't been reviewed since circumstances changed.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Well-protected",
        description:
          "You've done the hard work. The next step is making sure cover keeps pace with life changes (kids, mortgages, business interests) and that your IHT position is being actively managed.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // RECRUITMENT — fully ready-made templates
  // ---------------------------------------------------------------------------
  {
    id: "hiring-process-health-check",
    name: "Hiring Process Health Check",
    category: "Recruitment",
    emoji: "🧲",
    description:
      "How well does your hiring process attract, qualify and close the right people? A 7-question audit.",
    intro:
      "Most hiring problems aren't about the candidates — they're about the process. This 3-minute scorecard rates yours and tells you what to fix first.",
    ctaLabel: "Audit our hiring",
    theme: "card",
    brandColor: "#4f46e5",
    bookingLabel: "Book your hiring review",
    email: {
      subject: "Your Hiring Process Health Check results",
      greeting: "Hi {{firstName}},",
      intro:
        "Thanks for completing the Hiring Process Health Check. Your PDF report is attached.\n\nYou scored {{percent}}% — {{outcomeTitle}}.",
      bullets:
        "Where your process is leaking talent\nThe single biggest fix\nA simple framework you can use this week",
      bookingLine:
        "Want a fresh pair of eyes on your hiring funnel? Book a free 30-minute review.",
      signoff: "Best,\n— {{ownerName}}",
    },
    landingBlocks: [
      {
        id: "hero",
        type: "hero-split",
        headline: "Hiring is brutal right now. Is your process making it harder?",
        body: "A 3-minute audit of how you attract, qualify and close. You'll get a score across the 5 areas that decide whether great candidates say yes — and a personalised PDF.",
        ctaLabel: "Start the audit",
        ctaUrl: "#start",
        bullets: [
          "Built from 100+ hiring teardowns",
          "Personalised PDF report in your inbox",
          "Optional free 30-minute review",
        ],
        imageUrl: "",
        imageAlt: "",
        imagePosition: "right",
      },
      {
        id: "features",
        type: "feature-grid",
        heading: "Why this matters",
        subhead:
          "Companies blame the market for hiring pain. The truth is the process — from job spec to offer — is usually doing 80% of the damage.",
        columns: 3,
        items: [
          {
            id: "f1",
            iconUrl: "",
            title: "Attract",
            body: "If your job spec doesn't sell the role, even the best sourcer can't help.",
          },
          {
            id: "f2",
            iconUrl: "",
            title: "Qualify",
            body: "Structured interviews 2–3× the predictive validity vs unstructured ones.",
          },
          {
            id: "f3",
            iconUrl: "",
            title: "Close",
            body: "Most offers fail at compensation conversations that should have happened weeks earlier.",
          },
        ],
      },
    ],
    resultBlocks: [
      {
        id: "score",
        type: "score-display",
        align: "center",
        label: "Your Hiring Process score",
        showBar: true,
      },
      { id: "h1", type: "heading", text: "{{outcomeTitle}}", level: 2 },
      { id: "p1", type: "paragraph", text: "{{outcomeDescription}}" },
      { id: "div1", type: "divider" },
      {
        id: "h2",
        type: "heading",
        text: "What strong hiring teams do",
        level: 3,
      },
      {
        id: "list",
        type: "list",
        checkmark: true,
        items: [
          "Define a written ideal-candidate scorecard before posting any role",
          "Use structured interviews with the same questions for every candidate",
          "Set time-to-first-response targets (best teams aim for 24h)",
          "Sell the role at every stage, not just the final offer call",
          "Debrief every loss to find the actual reason candidates passed",
        ],
      },
      {
        id: "cta",
        type: "button",
        label: "Book your hiring review →",
        url: "",
        style: "primary",
      },
    ],
    pdfBlocks: [
      {
        id: "h1",
        type: "heading",
        text: "Your Hiring Process report",
        level: 1,
      },
      {
        id: "p1",
        type: "paragraph",
        text: "Hi {{firstName}}, here's a brief interpretation of your score and the highest-leverage actions most teams in your position can take this week.",
      },
      {
        id: "h2",
        type: "heading",
        text: "Your result: {{outcomeTitle}}",
        level: 2,
      },
      { id: "p2", type: "paragraph", text: "{{outcomeDescription}}" },
      {
        id: "h3",
        type: "heading",
        text: "What strong hiring teams do",
        level: 3,
      },
      {
        id: "checklist",
        type: "list",
        checkmark: true,
        items: [
          "Write an ideal-candidate scorecard before posting the role",
          "Use structured interviews with consistent questions across candidates",
          "Aim for first-response within 24 hours",
          "Sell the role at every stage, not just at offer",
          "Debrief every loss to learn the real reason",
        ],
      },
    ],
    questions: [
      {
        text: "Before opening a role, do you write down what 'great' looks like for it (skills, outcomes, must-haves)?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — every time, in a shared scorecard", score: 10 },
          { text: "Sometimes, in a job description but not a scorecard", score: 5 },
          { text: "No — we usually just post a JD", score: 0 },
        ],
      },
      {
        text: "How structured are your interviews? (same questions, same scoring across all candidates)",
        type: "single",
        required: true,
        options: [
          { text: "Fully structured with shared rubrics", score: 10 },
          { text: "Loosely structured", score: 5 },
          { text: "Mostly conversational / interviewer's choice", score: 0 },
        ],
      },
      {
        text: "What's your typical time from application to first human response?",
        type: "single",
        required: true,
        options: [
          { text: "Within 24 hours", score: 10 },
          { text: "2–4 days", score: 6 },
          { text: "A week or more", score: 2 },
          { text: "Often never, if they're not a fit", score: 0 },
        ],
      },
      {
        text: "Do you have a clear, written employee value proposition (EVP) candidates see early in the process?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — distinct, specific, used everywhere", score: 10 },
          { text: "We have one, but it's generic", score: 5 },
          { text: "No", score: 0 },
        ],
      },
      {
        text: "How predictable is your time-to-hire across roles?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "When a candidate turns you down at offer stage, do you know the real reason within a week?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — we always debrief", score: 10 },
          { text: "Sometimes", score: 5 },
          { text: "Rarely or never", score: 0 },
        ],
      },
      {
        text: "Optional — what's the role you're finding hardest to hire for right now?",
        type: "text",
        required: false,
        options: [{ text: "≥80 chars", score: 5, minChars: 80 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Reactive hiring",
        description:
          "Right now hiring happens to you, rather than the other way around. The single highest-impact change: write a one-page candidate scorecard before opening any role. It forces the hard conversations early and makes interviews dramatically more useful.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Working process",
        description:
          "You've built a lot of the right pieces but consistency is the gap. Locking down structured interviews and a 24h first-response standard will move the dial faster than any new sourcing channel.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "High-performing",
        description:
          "Your hiring is a real competitive advantage. From here, the leverage shifts to debriefs, calibration, and continually sharpening your EVP — small refinements compound across every role.",
      },
    ],
  },

  {
    id: "employer-brand-strength",
    name: "Employer Brand Strength",
    category: "Recruitment",
    emoji: "✨",
    description:
      "How easy is it for great people to find — and choose — your company? A 6-question audit of your employer brand.",
    intro:
      "Strong employer brands lower cost-per-hire and shorten time-to-fill. This 3-minute audit shows you where yours stands today.",
    ctaLabel: "Audit our brand",
    theme: "card",
    brandColor: "#e11d48",
    bookingLabel: "Book your employer-brand review",
    email: {
      subject: "Your Employer Brand Strength results",
      greeting: "Hi {{firstName}},",
      intro:
        "Thanks for completing the Employer Brand Strength audit. Your PDF report is attached.\n\nYou scored {{percent}}% — {{outcomeTitle}}.",
      bullets:
        "Where you're already differentiated\nWhat candidates can't find about you\nThe single thing to publish next",
      bookingLine:
        "Want feedback on what to publish next? Book a free 30-minute review.",
      signoff: "Cheers,\n— {{ownerName}}",
    },
    landingBlocks: [
      {
        id: "hero",
        type: "hero-split",
        headline: "Why do great people choose you over the competition?",
        body: "If you can't answer that crisply, neither can your candidates. A 3-minute audit of the public signals that decide whether top talent applies, ghosts, or accepts.",
        ctaLabel: "Audit our brand",
        ctaUrl: "#start",
        bullets: [
          "6-question audit, takes 3 minutes",
          "Personalised PDF in your inbox",
          "Includes a publish-next checklist",
        ],
        imageUrl: "",
        imageAlt: "",
        imagePosition: "right",
      },
      {
        id: "features",
        type: "feature-grid",
        heading: "What we'll check",
        subhead: "",
        columns: 3,
        items: [
          {
            id: "f1",
            iconUrl: "",
            title: "Careers page",
            body: "The single asset that converts intent into application.",
          },
          {
            id: "f2",
            iconUrl: "",
            title: "EVP clarity",
            body: "What candidates take away after 30 seconds on your site.",
          },
          {
            id: "f3",
            iconUrl: "",
            title: "Public proof",
            body: "Reviews, employee voices, content. The signals you can't fake.",
          },
        ],
      },
    ],
    resultBlocks: [
      {
        id: "score",
        type: "score-display",
        align: "center",
        label: "Your Employer Brand score",
        showBar: true,
      },
      { id: "h1", type: "heading", text: "{{outcomeTitle}}", level: 2 },
      { id: "p1", type: "paragraph", text: "{{outcomeDescription}}" },
      { id: "div1", type: "divider" },
      {
        id: "h2",
        type: "heading",
        text: "Quick wins to publish this month",
        level: 3,
      },
      {
        id: "list",
        type: "list",
        checkmark: true,
        items: [
          "A 1-page careers landing with a written EVP and 3 employee voices",
          "Active Glassdoor / Indeed presence with at least 10 recent reviews",
          "Two-paragraph 'a day in the life' for each main role family",
          "A short Loom from your founder explaining why this place exists",
          "An open job-spec template that sells, not lists",
        ],
      },
      {
        id: "cta",
        type: "button",
        label: "Book your employer-brand review →",
        url: "",
        style: "primary",
      },
    ],
    pdfBlocks: [
      {
        id: "h1",
        type: "heading",
        text: "Your Employer Brand report",
        level: 1,
      },
      {
        id: "p1",
        type: "paragraph",
        text: "Hi {{firstName}}, here's a quick interpretation of your score and a list of the highest-leverage things to publish next.",
      },
      {
        id: "h2",
        type: "heading",
        text: "Your result: {{outcomeTitle}}",
        level: 2,
      },
      { id: "p2", type: "paragraph", text: "{{outcomeDescription}}" },
      { id: "h3", type: "heading", text: "Quick wins", level: 3 },
      {
        id: "checklist",
        type: "list",
        checkmark: true,
        items: [
          "A 1-page careers landing with EVP + 3 employee voices",
          "Active Glassdoor / Indeed presence (10+ recent reviews)",
          "'A day in the life' for each main role family",
          "Founder-led Loom explaining why the company exists",
          "A job-spec template that sells the role, not lists tasks",
        ],
      },
    ],
    questions: [
      {
        text: "Do you have a dedicated careers page (not just a list of open roles)?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — with EVP, photos, employee voices", score: 10 },
          { text: "Yes, but it's mostly a list of jobs", score: 5 },
          { text: "No — we just post on job boards", score: 0 },
        ],
      },
      {
        text: "Could a candidate articulate, in one sentence, why someone would choose to work for you?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — and we say the same thing", score: 10 },
          { text: "Probably, but it varies", score: 5 },
          { text: "No — we haven't defined it", score: 0 },
        ],
      },
      {
        text: "How active is your presence on Glassdoor / Indeed (recent reviews, employer responses)?",
        type: "single",
        required: true,
        options: [
          { text: "Very active — owners respond, recent reviews", score: 10 },
          { text: "Some reviews but not actively managed", score: 5 },
          { text: "Sparse or unclaimed", score: 0 },
        ],
      },
      {
        text: "Do you publish content showing what working at your company is actually like?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — at least monthly across platforms", score: 10 },
          { text: "Occasionally", score: 5 },
          { text: "No", score: 0 },
        ],
      },
      {
        text: "How distinctive is your written job-spec compared to competitors?",
        type: "scale",
        required: true,
        options: [],
      },
      {
        text: "Optional — describe the type of person you want more of, in your own words.",
        type: "text",
        required: false,
        options: [{ text: "≥80 chars", score: 5, minChars: 80 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Invisible",
        description:
          "Right now you're competing on salary because you're not competing on anything else. The fix isn't budget — it's giving candidates a clear, specific reason to choose you. A simple 1-page careers landing with a written EVP usually moves application quality more than any single channel change.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Recognised",
        description:
          "You're showing up — but the message is fragmented. Tightening your EVP and using it consistently across careers page, JDs and outreach is usually the single highest-leverage move from here.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Magnetic",
        description:
          "Candidates know who you are and why they'd want to be there. The next leverage point is depth — employee-generated content, podcasts, written stories — that turns interest into a steady stream of inbound applications.",
      },
    ],
  },

  {
    id: "onboarding-readiness-audit",
    name: "Onboarding Readiness Audit",
    category: "Recruitment",
    emoji: "🚀",
    description:
      "How quickly do new hires reach full productivity? An audit of your onboarding flow from offer accepted to month three.",
    intro:
      "The first 90 days decide whether a great hire stays great. This 3-minute audit shows you where your onboarding is leaking momentum.",
    ctaLabel: "Audit onboarding",
    theme: "card",
    brandColor: "#d97706",
    bookingLabel: "Book your onboarding review",
    email: {
      subject: "Your Onboarding Readiness Audit results",
      greeting: "Hi {{firstName}},",
      intro:
        "Thanks for completing the Onboarding Readiness Audit. Your PDF report is attached.\n\nYou scored {{percent}}% — {{outcomeTitle}}.",
      bullets:
        "Where new hires lose momentum\nThe single biggest first-90-days fix\nA simple template to copy",
      bookingLine:
        "Want a structured walk-through of your first-90-days? Book a free review.",
      signoff: "Cheers,\n— {{ownerName}}",
    },
    landingBlocks: [
      {
        id: "hero",
        type: "hero-split",
        headline: "Are your new hires productive in 30 days — or still lost at 90?",
        body: "A 3-minute audit of the onboarding moments that decide whether a hire ramps up fast or quietly disengages. Personalised PDF, plain checklist.",
        ctaLabel: "Audit onboarding",
        ctaUrl: "#start",
        bullets: [
          "6-question audit, takes 3 minutes",
          "Personalised PDF report",
          "Includes a 30/60/90 template you can copy",
        ],
        imageUrl: "",
        imageAlt: "",
        imagePosition: "right",
      },
      {
        id: "features",
        type: "feature-grid",
        heading: "Where most onboarding breaks",
        subhead: "",
        columns: 3,
        items: [
          {
            id: "f1",
            iconUrl: "",
            title: "Pre-boarding silence",
            body: "Three weeks of nothing between offer and start day kills momentum.",
          },
          {
            id: "f2",
            iconUrl: "",
            title: "Day 1 admin",
            body: "If laptops, accounts, and access aren't ready, the first impression is fixed for months.",
          },
          {
            id: "f3",
            iconUrl: "",
            title: "Manager check-ins",
            body: "Most managers go quiet at week 4. That's when new hires need them most.",
          },
        ],
      },
    ],
    resultBlocks: [
      {
        id: "score",
        type: "score-display",
        align: "center",
        label: "Your Onboarding score",
        showBar: true,
      },
      { id: "h1", type: "heading", text: "{{outcomeTitle}}", level: 2 },
      { id: "p1", type: "paragraph", text: "{{outcomeDescription}}" },
      { id: "div1", type: "divider" },
      { id: "h2", type: "heading", text: "What good onboarding looks like", level: 3 },
      {
        id: "list",
        type: "list",
        checkmark: true,
        items: [
          "Pre-boarding pack the day after offer is signed",
          "Equipment + access ready before day 1",
          "A named buddy who isn't the manager",
          "A written 30/60/90 plan agreed in week 1",
          "Manager check-ins every Friday for the first 8 weeks",
          "A formal 90-day review, with two-way feedback",
        ],
      },
      {
        id: "cta",
        type: "button",
        label: "Book your onboarding review →",
        url: "",
        style: "primary",
      },
    ],
    pdfBlocks: [
      {
        id: "h1",
        type: "heading",
        text: "Your Onboarding Readiness report",
        level: 1,
      },
      {
        id: "p1",
        type: "paragraph",
        text: "Hi {{firstName}}, here's a brief interpretation of your score and the most useful actions for teams in your position.",
      },
      {
        id: "h2",
        type: "heading",
        text: "Your result: {{outcomeTitle}}",
        level: 2,
      },
      { id: "p2", type: "paragraph", text: "{{outcomeDescription}}" },
      {
        id: "h3",
        type: "heading",
        text: "What good onboarding looks like",
        level: 3,
      },
      {
        id: "checklist",
        type: "list",
        checkmark: true,
        items: [
          "Pre-boarding pack the day after offer is signed",
          "Equipment + access ready before day 1",
          "A named buddy who isn't the manager",
          "A written 30/60/90 plan agreed in week 1",
          "Manager check-ins every Friday for the first 8 weeks",
          "A formal 90-day review, with two-way feedback",
        ],
      },
    ],
    questions: [
      {
        text: "Once a candidate accepts the offer, what happens between then and day 1?",
        type: "single",
        required: true,
        options: [
          { text: "Pre-boarding pack + regular touchpoints", score: 10 },
          { text: "Some emails, but mostly silence", score: 4 },
          { text: "Pretty much nothing until they walk in", score: 0 },
        ],
      },
      {
        text: "On day 1, are equipment, accounts and access all ready before the new hire arrives?",
        type: "single",
        required: true,
        options: [
          { text: "Always", score: 10 },
          { text: "Usually — sometimes one or two delays", score: 5 },
          { text: "Often a scramble", score: 0 },
        ],
      },
      {
        text: "Does every new hire get a named buddy (not their manager)?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — every time", score: 10 },
          { text: "For some roles", score: 5 },
          { text: "No", score: 0 },
        ],
      },
      {
        text: "Is there a written 30/60/90 day plan agreed between manager and new hire in their first week?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — every hire, signed off", score: 10 },
          { text: "Sometimes — informal", score: 5 },
          { text: "No", score: 0 },
        ],
      },
      {
        text: "How regularly does the line manager check in during the first 8 weeks?",
        type: "single",
        required: true,
        options: [
          { text: "Weekly, structured", score: 10 },
          { text: "Ad-hoc", score: 5 },
          { text: "Only when there's a problem", score: 0 },
        ],
      },
      {
        text: "Do you run a formal 90-day review with two-way feedback?",
        type: "single",
        required: true,
        options: [
          { text: "Yes — every hire", score: 10 },
          { text: "Sometimes", score: 5 },
          { text: "Never", score: 0 },
        ],
      },
      {
        text: "Optional — what's the most common reason a new hire hasn't worked out for you in the past?",
        type: "text",
        required: false,
        options: [{ text: "≥80 chars", score: 5, minChars: 80 }],
      },
    ],
    outcomes: [
      {
        minScore: 0,
        maxScore: 33,
        title: "Sink or swim",
        description:
          "New hires are largely figuring it out alone. The good news is that fixing onboarding has one of the highest ROI of any people-system change — most teams see noticeable retention improvement within 90 days of putting a written plan in place.",
      },
      {
        minScore: 34,
        maxScore: 66,
        title: "Decent",
        description:
          "You've got the bones in place but the experience is uneven. Standardising the 30/60/90 plan and protecting the weekly manager check-in for the first 8 weeks usually does more than any other change.",
      },
      {
        minScore: 67,
        maxScore: 100,
        title: "Excellent",
        description:
          "Your onboarding is a real asset. From here, the leverage is in continuous improvement — measuring time-to-productivity, gathering systematic feedback, and feeding it back into role design.",
      },
    ],
  },
];

export function findTemplate(id: string): Template | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}
