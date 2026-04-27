// Sample household + reference data for HouseholdMap.
// UK-friendly taxonomies (with old US-style IDs aliased for backwards compat).

export const ASSET_KINDS = [
  { id: "cash",        label: "Cash / Current Account", icon: "💵" },
  { id: "savings",     label: "Savings",                icon: "🏦" },
  { id: "isa",         label: "ISA (Stocks & Shares)",  icon: "📈" },
  { id: "junior-isa",  label: "Junior ISA",             icon: "🎓" },
  { id: "brokerage",   label: "Investments (GIA)",      icon: "📊" },
  { id: "sipp",        label: "Pension (SIPP / Workplace)", icon: "🪺" },
  { id: "realestate",  label: "Property",               icon: "🏠" },
  { id: "vehicle",     label: "Vehicle",                icon: "🚗" },
  { id: "business",    label: "Business",               icon: "🏢" },
  { id: "crypto",      label: "Crypto",                 icon: "🪙" },
  { id: "other-asset", label: "Other Asset",            icon: "📦" },
];

// Legacy US-style asset IDs that may exist in older data. Not in the
// dropdown, but render with sensible labels if encountered.
export const ASSET_KIND_ALIASES = [
  { id: "retirement", label: "Pension (legacy 401k/IRA)", icon: "🪺" },
  { id: "529",        label: "Education Savings (legacy 529)", icon: "🎓" },
  { id: "hsa",        label: "Health Savings (legacy HSA)",    icon: "🩺" },
];

export const LIABILITY_KINDS = [
  { id: "mortgage",     label: "Mortgage",              icon: "🏠" },
  { id: "heloc",        label: "Second Charge / HELOC", icon: "🔑" },
  { id: "auto-loan",    label: "Car Finance",           icon: "🚗" },
  { id: "student-loan", label: "Student Loan",          icon: "🎓" },
  { id: "credit-card",  label: "Credit Card",           icon: "💳" },
  { id: "personal",     label: "Personal Loan",         icon: "📄" },
  { id: "business-loan",label: "Business Loan",         icon: "🏢" },
  { id: "other-liab",   label: "Other Liability",       icon: "📦" },
];

export const INSURANCE_KINDS = [
  { id: "life-term",  label: "Term Life Assurance",         icon: "🛡" },
  { id: "life-perm",  label: "Whole-of-Life Assurance",     icon: "🛡" },
  { id: "disability", label: "Income Protection",           icon: "🦽" },
  { id: "ltc",        label: "Long-Term Care",              icon: "🧓" },
  { id: "health",     label: "Private Medical Insurance",   icon: "❤️" },
  { id: "auto-ins",   label: "Car Insurance",               icon: "🚙" },
  { id: "home-ins",   label: "Buildings & Contents",        icon: "🏡" },
  { id: "umbrella",   label: "Personal Liability / Umbrella", icon: "☂" },
  { id: "other-ins",  label: "Other Cover",                 icon: "🔖" },
];

export const CASHFLOW_KINDS = [
  { id: "salary",     label: "Salary",            icon: "💼", direction: "in" },
  { id: "self-emp",   label: "Self-Employed",     icon: "🧑‍💻", direction: "in" },
  { id: "rental",     label: "Rental Income",     icon: "🏘", direction: "in" },
  { id: "investment", label: "Investment Income", icon: "📊", direction: "in" },
  { id: "ssi",        label: "State Pension",     icon: "🏛", direction: "in" },
  { id: "other-in",   label: "Other Income",      icon: "➕", direction: "in" },

  { id: "housing",    label: "Housing",                icon: "🏠", direction: "out" },
  { id: "utilities",  label: "Utilities",              icon: "💡", direction: "out" },
  { id: "food",       label: "Food / Groceries",       icon: "🍽", direction: "out" },
  { id: "transport",  label: "Transport",              icon: "⛽", direction: "out" },
  { id: "childcare",  label: "Childcare",              icon: "🧸", direction: "out" },
  { id: "education",  label: "Education / School Fees", icon: "📚", direction: "out" },
  { id: "healthcare", label: "Healthcare",             icon: "🏥", direction: "out" },
  { id: "insurance-p",label: "Insurance Premiums",     icon: "🛡", direction: "out" },
  { id: "savings-out",label: "Savings / Pension Contrib.", icon: "💰", direction: "out" },
  { id: "debt-pmt",   label: "Debt Repayment",         icon: "💳", direction: "out" },
  { id: "other-out",  label: "Other Expense",          icon: "➖", direction: "out" },
];

export const FREQUENCIES = [
  { id: "monthly",   label: "Monthly",   per_year: 12 },
  { id: "biweekly",  label: "Bi-Weekly", per_year: 26 },
  { id: "weekly",    label: "Weekly",    per_year: 52 },
  { id: "quarterly", label: "Quarterly", per_year: 4 },
  { id: "annually",  label: "Annually",  per_year: 1 },
];

export const RELATIONSHIPS = [
  "Self", "Spouse", "Partner", "Child", "Dependent", "Parent", "Other",
];

export function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

// Default annual growth rates (%) by asset kind, used in projections
// when an asset doesn't specify its own growthRate.
export const DEFAULT_RETURNS = {
  cash: 0.5,
  savings: 2.0,
  isa: 5.5,
  "junior-isa": 5.0,
  brokerage: 5.5,
  sipp: 6.0,
  realestate: 3.0,
  vehicle: -10.0,
  business: 4.0,
  crypto: 0.0,
  "other-asset": 2.0,
  // Legacy aliases (still respected if present in older data).
  retirement: 6.0,
  "529": 5.0,
  hsa: 4.0,
};

// Life-event types. Each event fires at a specific year and mutates the
// running simulation.
export const EVENT_KINDS = [
  { id: "retire",          label: "Retirement",                    icon: "🌴" },
  { id: "asset-sale",      label: "Sell Asset",                    icon: "💰" },
  { id: "asset-purchase",  label: "Buy Asset",                     icon: "🛒" },
  { id: "liability-payoff",label: "Pay Off Liability",             icon: "✅" },
  { id: "income-change",   label: "Income Change",                 icon: "💼" },
  { id: "expense-change",  label: "Expense Change",                icon: "🧾" },
  { id: "education",       label: "Education / Higher Education",  icon: "🎓" },
  { id: "lump-sum",        label: "Lump Sum (in / out)",           icon: "📦" },
];

// Default household-level assumptions for projections.
export const DEFAULT_ASSUMPTIONS = () => ({
  currency: "GBP",
  startYear: new Date().getFullYear(),
  yearsToProject: 30,
  inflationRate: 2.5,
  retirementWithdrawalRate: 4.0,
  defaultReturns: { ...DEFAULT_RETURNS },
});

export const SUPPORTED_CURRENCIES = [
  { id: "GBP", label: "British Pound", symbol: "£" },
  { id: "USD", label: "US Dollar",     symbol: "$" },
  { id: "EUR", label: "Euro",          symbol: "€" },
];

export const SAMPLE_HOUSEHOLD = {
  name: "The Carter Household",
  people: [
    { id: "p_self",    name: "Alex Carter",   relationship: "Self",   age: 42, retirementAge: 67, color: "#1f7ad6" },
    { id: "p_spouse",  name: "Jamie Carter",  relationship: "Spouse", age: 40, retirementAge: 67, color: "#2bbfa6" },
    { id: "p_child1",  name: "Riley",         relationship: "Child",  age: 12, retirementAge: null, color: "#c08433" },
    { id: "p_child2",  name: "Sam",           relationship: "Child",  age: 8,  retirementAge: null, color: "#c08433" },
  ],
  assets: [
    { id: "a1", name: "Joint Current Account", kind: "cash",       value: 14500, ownerIds: ["p_self","p_spouse"], institution: "High Street Bank" },
    { id: "a2", name: "Emergency Savings",     kind: "savings",    value: 28000, ownerIds: ["p_self","p_spouse"], institution: "Easy-Access Saver" },
    { id: "a3", name: "Alex Workplace Pension",kind: "sipp",       value: 215000,ownerIds: ["p_self"],            institution: "Group Personal Pension" },
    { id: "a4", name: "Jamie SIPP",            kind: "sipp",       value: 78000, ownerIds: ["p_spouse"],          institution: "SIPP Provider" },
    { id: "a5", name: "Alex Stocks & Shares ISA", kind: "isa",     value: 46000, ownerIds: ["p_self"],            institution: "ISA Provider" },
    { id: "a6", name: "Jamie Stocks & Shares ISA", kind: "isa",    value: 32000, ownerIds: ["p_spouse"],          institution: "ISA Provider" },
    { id: "a7", name: "Joint GIA",             kind: "brokerage",  value: 22000, ownerIds: ["p_self","p_spouse"], institution: "Investment Platform" },
    { id: "a8", name: "Family Home",           kind: "realestate", value: 485000,ownerIds: ["p_self","p_spouse"], institution: "" },
    { id: "a9", name: "Riley Junior ISA",      kind: "junior-isa", value: 14500, ownerIds: ["p_child1"],          institution: "JISA Provider" },
    { id: "a10",name: "Sam Junior ISA",        kind: "junior-isa", value: 6800,  ownerIds: ["p_child2"],          institution: "JISA Provider" },
    { id: "a11",name: "Family Estate Car",     kind: "vehicle",    value: 18000, ownerIds: ["p_self","p_spouse"], institution: "" },
  ],
  liabilities: [
    { id: "l1", name: "Mortgage",        kind: "mortgage",     balance: 248000, rate: 4.85, payment: 1620, ownerIds: ["p_self","p_spouse"], institution: "High Street Lender" },
    { id: "l2", name: "Car Finance",     kind: "auto-loan",    balance: 12500,  rate: 7.9,  payment: 295,  ownerIds: ["p_spouse"],          institution: "Finance Provider" },
    { id: "l3", name: "Credit Card",     kind: "credit-card",  balance: 1850,   rate: 24.9, payment: 150,  ownerIds: ["p_self"],            institution: "Card Issuer" },
  ],
  insurance: [
    { id: "i1", name: "Alex Term Life Assurance",   kind: "life-term", coverage: 500000, premium: 28,  frequency: "monthly", insuredIds: ["p_self"],   beneficiaryIds: ["p_spouse"] },
    { id: "i2", name: "Jamie Term Life Assurance",  kind: "life-term", coverage: 350000, premium: 24,  frequency: "monthly", insuredIds: ["p_spouse"], beneficiaryIds: ["p_self"] },
    { id: "i3", name: "Alex Income Protection",     kind: "disability",coverage: 4000,   premium: 42,  frequency: "monthly", insuredIds: ["p_self"],   beneficiaryIds: [] },
    { id: "i4", name: "Family Private Medical",     kind: "health",    coverage: 0,      premium: 165, frequency: "monthly", insuredIds: ["p_self","p_spouse","p_child1","p_child2"], beneficiaryIds: [] },
    { id: "i5", name: "Buildings & Contents",       kind: "home-ins",  coverage: 485000, premium: 480, frequency: "annually",insuredIds: ["p_self","p_spouse"], beneficiaryIds: [] },
    { id: "i6", name: "Car Insurance",              kind: "auto-ins",  coverage: 0,      premium: 78,  frequency: "monthly", insuredIds: ["p_self","p_spouse"], beneficiaryIds: [] },
  ],
  cashflows: [
    { id: "c1",  name: "Alex Salary",             kind: "salary",     amount: 5400, frequency: "monthly", direction: "in",  ownerIds: ["p_self"],   inflate: true, stopAtRetirement: true },
    { id: "c2",  name: "Jamie Salary",            kind: "salary",     amount: 3200, frequency: "monthly", direction: "in",  ownerIds: ["p_spouse"], inflate: true, stopAtRetirement: true },
    { id: "c3",  name: "Mortgage Payment",        kind: "housing",    amount: 1620, frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c4",  name: "Council Tax & Utilities", kind: "utilities",  amount: 380,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c5",  name: "Food & Groceries",        kind: "food",       amount: 720,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c6",  name: "Childcare / Activities",  kind: "childcare",  amount: 320,  frequency: "monthly", direction: "out", ownerIds: ["p_child1","p_child2"] },
    { id: "c7",  name: "Car & Fuel",              kind: "transport",  amount: 380,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c8",  name: "Healthcare Out-of-Pocket",kind: "healthcare", amount: 90,   frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c9",  name: "Insurance Premiums",      kind: "insurance-p",amount: 377,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c10", name: "Pension Contributions",   kind: "savings-out",amount: 720,  frequency: "monthly", direction: "out", ownerIds: ["p_self"] },
    { id: "c11", name: "ISA Contributions",       kind: "savings-out",amount: 500,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c12", name: "Junior ISA Contributions",kind: "savings-out",amount: 200,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c13", name: "Car Finance Payment",     kind: "debt-pmt",   amount: 295,  frequency: "monthly", direction: "out", ownerIds: ["p_spouse"] },
    { id: "c14", name: "Other Living Costs",      kind: "other-out",  amount: 480,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"], inflate: true },
  ],
  assumptions: {
    currency: "GBP",
    startYear: new Date().getFullYear(),
    yearsToProject: 35,
    inflationRate: 2.5,
    retirementWithdrawalRate: 4.0,
    defaultReturns: { ...DEFAULT_RETURNS },
  },
  events: [
    { id: "e1", year: new Date().getFullYear() + 6,  kind: "education",
      personId: "p_child1", school: "University", annualCost: 18500, years: 3,
      notes: "Undergraduate tuition + maintenance" },
    { id: "e2", year: new Date().getFullYear() + 10, kind: "education",
      personId: "p_child2", school: "University", annualCost: 18500, years: 3,
      notes: "Undergraduate tuition + maintenance" },
  ],
  goals: [],
};
