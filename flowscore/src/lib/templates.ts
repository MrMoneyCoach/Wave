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
  theme?: "minimal" | "card";
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
];

export function findTemplate(id: string): Template | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}
