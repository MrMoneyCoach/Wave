// Sample household + reference data for HouseholdMap.

export const ASSET_KINDS = [
  { id: "cash",        label: "Cash / Checking",      icon: "💵" },
  { id: "savings",     label: "Savings",              icon: "🏦" },
  { id: "brokerage",   label: "Investments",          icon: "📈" },
  { id: "retirement",  label: "Retirement (401k/IRA)", icon: "🪺" },
  { id: "529",         label: "Education / 529",      icon: "🎓" },
  { id: "hsa",         label: "HSA",                  icon: "🩺" },
  { id: "realestate",  label: "Real Estate",          icon: "🏠" },
  { id: "vehicle",     label: "Vehicle",              icon: "🚗" },
  { id: "business",    label: "Business",             icon: "🏢" },
  { id: "crypto",      label: "Crypto",               icon: "🪙" },
  { id: "other-asset", label: "Other Asset",          icon: "📦" },
];

export const LIABILITY_KINDS = [
  { id: "mortgage",     label: "Mortgage",       icon: "🏠" },
  { id: "heloc",        label: "HELOC",          icon: "🔑" },
  { id: "auto-loan",    label: "Auto Loan",      icon: "🚗" },
  { id: "student-loan", label: "Student Loan",   icon: "🎓" },
  { id: "credit-card",  label: "Credit Card",    icon: "💳" },
  { id: "personal",     label: "Personal Loan",  icon: "📄" },
  { id: "business-loan",label: "Business Loan",  icon: "🏢" },
  { id: "other-liab",   label: "Other Liability",icon: "📦" },
];

export const INSURANCE_KINDS = [
  { id: "life-term",  label: "Term Life",     icon: "🛡" },
  { id: "life-perm",  label: "Permanent Life",icon: "🛡" },
  { id: "disability", label: "Disability",    icon: "🦽" },
  { id: "ltc",        label: "Long-Term Care",icon: "🧓" },
  { id: "health",     label: "Health",        icon: "❤️" },
  { id: "auto-ins",   label: "Auto",          icon: "🚙" },
  { id: "home-ins",   label: "Homeowners",    icon: "🏡" },
  { id: "umbrella",   label: "Umbrella",      icon: "☂" },
  { id: "other-ins",  label: "Other Coverage",icon: "🔖" },
];

export const CASHFLOW_KINDS = [
  { id: "salary",     label: "Salary",         icon: "💼", direction: "in" },
  { id: "self-emp",   label: "Self-Employed",  icon: "🧑‍💻", direction: "in" },
  { id: "rental",     label: "Rental Income",  icon: "🏘", direction: "in" },
  { id: "investment", label: "Investment Inc.",icon: "📊", direction: "in" },
  { id: "ssi",        label: "Social Security",icon: "🏛", direction: "in" },
  { id: "other-in",   label: "Other Income",   icon: "➕", direction: "in" },

  { id: "housing",    label: "Housing",        icon: "🏠", direction: "out" },
  { id: "utilities",  label: "Utilities",      icon: "💡", direction: "out" },
  { id: "food",       label: "Food",           icon: "🍽", direction: "out" },
  { id: "transport",  label: "Transportation", icon: "⛽", direction: "out" },
  { id: "childcare",  label: "Childcare",      icon: "🧸", direction: "out" },
  { id: "education",  label: "Education",      icon: "📚", direction: "out" },
  { id: "healthcare", label: "Healthcare",     icon: "🏥", direction: "out" },
  { id: "insurance-p",label: "Insurance Prem.",icon: "🛡", direction: "out" },
  { id: "savings-out",label: "Savings Contrib.",icon: "💰", direction: "out" },
  { id: "debt-pmt",   label: "Debt Payment",   direction: "out", icon: "💳" },
  { id: "other-out",  label: "Other Expense",  icon: "➖", direction: "out" },
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

export const SAMPLE_HOUSEHOLD = {
  name: "The Carter Household",
  people: [
    { id: "p_self",    name: "Alex Carter",   relationship: "Self",   age: 42, color: "#1f7ad6" },
    { id: "p_spouse",  name: "Jamie Carter",  relationship: "Spouse", age: 40, color: "#2bbfa6" },
    { id: "p_child1",  name: "Riley",         relationship: "Child",  age: 12, color: "#c08433" },
    { id: "p_child2",  name: "Sam",           relationship: "Child",  age: 8,  color: "#c08433" },
  ],
  assets: [
    { id: "a1", name: "Joint Checking",     kind: "cash",       value: 18500,  ownerIds: ["p_self","p_spouse"], institution: "Local Bank" },
    { id: "a2", name: "Emergency Savings",  kind: "savings",    value: 42000,  ownerIds: ["p_self","p_spouse"], institution: "High-Yield Savings" },
    { id: "a3", name: "Alex 401(k)",        kind: "retirement", value: 285000, ownerIds: ["p_self"],            institution: "Employer Plan" },
    { id: "a4", name: "Jamie Roth IRA",     kind: "retirement", value: 92000,  ownerIds: ["p_spouse"],          institution: "Brokerage" },
    { id: "a5", name: "Joint Brokerage",    kind: "brokerage",  value: 64000,  ownerIds: ["p_self","p_spouse"], institution: "Brokerage" },
    { id: "a6", name: "Primary Residence",  kind: "realestate", value: 540000, ownerIds: ["p_self","p_spouse"], institution: "" },
    { id: "a7", name: "Riley 529",          kind: "529",        value: 28000,  ownerIds: ["p_child1"],          institution: "529 Plan" },
    { id: "a8", name: "Sam 529",            kind: "529",        value: 14000,  ownerIds: ["p_child2"],          institution: "529 Plan" },
    { id: "a9", name: "Family SUV",         kind: "vehicle",    value: 32000,  ownerIds: ["p_self","p_spouse"], institution: "" },
    { id: "a10",name: "HSA",                kind: "hsa",        value: 16000,  ownerIds: ["p_self"],            institution: "HSA Provider" },
  ],
  liabilities: [
    { id: "l1", name: "Mortgage",        kind: "mortgage",     balance: 312000, rate: 4.25, payment: 1980, ownerIds: ["p_self","p_spouse"], institution: "Bank" },
    { id: "l2", name: "Auto Loan",       kind: "auto-loan",    balance: 18500,  rate: 5.9,  payment: 410,  ownerIds: ["p_spouse"],          institution: "Credit Union" },
    { id: "l3", name: "Credit Card",     kind: "credit-card",  balance: 3200,   rate: 19.99,payment: 200,  ownerIds: ["p_self"],            institution: "Card Issuer" },
    { id: "l4", name: "Student Loan",    kind: "student-loan", balance: 12400,  rate: 4.5,  payment: 180,  ownerIds: ["p_spouse"],          institution: "Federal" },
  ],
  insurance: [
    { id: "i1", name: "Alex Term Life",     kind: "life-term", coverage: 750000, premium: 38,  frequency: "monthly", insuredIds: ["p_self"],   beneficiaryIds: ["p_spouse"] },
    { id: "i2", name: "Jamie Term Life",    kind: "life-term", coverage: 500000, premium: 32,  frequency: "monthly", insuredIds: ["p_spouse"], beneficiaryIds: ["p_self"] },
    { id: "i3", name: "Group Disability",   kind: "disability",coverage: 5000,   premium: 0,   frequency: "monthly", insuredIds: ["p_self"],   beneficiaryIds: [] },
    { id: "i4", name: "Family Health Plan", kind: "health",    coverage: 0,      premium: 480, frequency: "monthly", insuredIds: ["p_self","p_spouse","p_child1","p_child2"], beneficiaryIds: [] },
    { id: "i5", name: "Homeowners",         kind: "home-ins",  coverage: 540000, premium: 1450,frequency: "annually",insuredIds: ["p_self","p_spouse"], beneficiaryIds: [] },
    { id: "i6", name: "Auto",               kind: "auto-ins",  coverage: 100000, premium: 142, frequency: "monthly", insuredIds: ["p_self","p_spouse"], beneficiaryIds: [] },
    { id: "i7", name: "Umbrella",           kind: "umbrella",  coverage: 1000000,premium: 280, frequency: "annually",insuredIds: ["p_self","p_spouse"], beneficiaryIds: [] },
  ],
  cashflows: [
    { id: "c1",  name: "Alex Salary",       kind: "salary",     amount: 9800, frequency: "monthly", direction: "in",  ownerIds: ["p_self"]   },
    { id: "c2",  name: "Jamie Salary",      kind: "salary",     amount: 6200, frequency: "monthly", direction: "in",  ownerIds: ["p_spouse"] },
    { id: "c3",  name: "Mortgage Payment",  kind: "housing",    amount: 1980, frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c4",  name: "Utilities",         kind: "utilities",  amount: 320,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c5",  name: "Groceries",         kind: "food",       amount: 1100, frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c6",  name: "Childcare/Camps",   kind: "childcare",  amount: 480,  frequency: "monthly", direction: "out", ownerIds: ["p_child1","p_child2"] },
    { id: "c7",  name: "Auto + Gas",        kind: "transport",  amount: 540,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c8",  name: "Healthcare OOP",    kind: "healthcare", amount: 220,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c9",  name: "Insurance Premiums",kind: "insurance-p",amount: 692,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c10", name: "401(k) Contribution",kind:"savings-out",amount: 1500, frequency: "monthly", direction: "out", ownerIds: ["p_self"] },
    { id: "c11", name: "529 Contributions", kind: "savings-out",amount: 400,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
    { id: "c12", name: "Auto Loan Pmt",     kind: "debt-pmt",   amount: 410,  frequency: "monthly", direction: "out", ownerIds: ["p_spouse"] },
    { id: "c13", name: "Student Loan Pmt",  kind: "debt-pmt",   amount: 180,  frequency: "monthly", direction: "out", ownerIds: ["p_spouse"] },
    { id: "c14", name: "Other Expenses",    kind: "other-out",  amount: 600,  frequency: "monthly", direction: "out", ownerIds: ["p_self","p_spouse"] },
  ],
};
