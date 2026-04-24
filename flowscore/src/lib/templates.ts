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

export type Template = {
  id: string;
  name: string;
  category: string;
  emoji: string;
  description: string;
  intro: string;
  ctaLabel: string;
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
];

export function findTemplate(id: string): Template | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}
