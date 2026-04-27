# UK Fact-Find — Question List for FlowScore

A structured set of questions covering everything HouseholdMap needs to build
a complete client picture (people, assets, liabilities, insurance, cash flow,
goals, risk). Designed to be pasted into a FlowScore quiz at
https://flowscore.vercel.app and to map cleanly back into the HouseholdMap
data model later.

Each section heading corresponds to a HouseholdMap entity; each bullet is one
question. Suggested answer types are noted in `[brackets]`.

---

## A. About You & Your Household

1. Your full name [text]
2. Your date of birth [date]
3. Your gender [text — optional]
4. Your marital status [single | married | civil partnership | cohabiting | separated | divorced | widowed]
5. Your nationality and country of tax residence [text]
6. Your home address (line 1, town/city, county, postcode) [4 × text]
7. Best contact email [email]
8. Best contact phone [tel]
9. Do you have a spouse or partner whose finances should be included? [yes/no]
10. (If yes) Spouse / partner full name [text]
11. (If yes) Spouse / partner date of birth [date]
12. (If yes) Spouse / partner contact email [email]
13. How many dependent children or other dependants do you have? [number]
14. (Repeat per dependant) Name [text]
15. (Repeat per dependant) Date of birth [date]
16. (Repeat per dependant) Relationship [child | step-child | parent | other]
17. (Repeat per dependant) Are they financially dependent on you today? [yes/no]
18. Do you currently support any non-dependent family members? [yes/no — long text if yes]

## B. Health & Wellbeing

19. Are you in good general health? [yes/no — long text if no]
20. Do you currently smoke or vape nicotine? [yes/no]
21. Have you smoked in the last 12 months? [yes/no]
22. Any pre-existing medical conditions relevant to insurance? [long text]
23. Does your spouse / partner answer the same on all of the above? [yes/no — long text]

## C. Employment & Income

24. Your employment status [employed | self-employed | director | retired | not working]
25. Your employer or business name [text]
26. Your job title [text]
27. Your gross annual salary or drawings [number — currency]
28. Frequency of pay [monthly | 4-weekly | weekly | quarterly | annual]
29. Annual bonus expected (if any) [number]
30. Other regular income (rental, dividends, freelance) [number — annual]
31. State Pension currently being received? [yes/no — amount per week if yes]
32. Other pension income in payment? [list: provider, gross annual, indexation]
33. Spouse / partner employment status, income, and any pension in payment [repeat 24–32]
34. Anticipated retirement age for you [number]
35. Anticipated retirement age for spouse / partner [number]

## D. Monthly Expenditure

(All figures monthly unless noted.)

36. Mortgage or rent [number]
37. Council tax [number]
38. Utilities (gas, electric, water) [number]
39. Telecoms (broadband, mobile, TV) [number]
40. Food and household groceries [number]
41. Transport (fuel, public transport, parking) [number]
42. Car finance / lease [number]
43. Vehicle insurance, road tax, MOT [number — average per month]
44. Childcare / school fees / activities [number]
45. Health (private medical, dental, optical) [number]
46. Insurance premiums (life, income protection, etc.) [number]
47. Pension contributions (personal — exclude employer's contribution) [number]
48. ISA / savings contributions [number]
49. Junior ISA / Child Trust contributions [number]
50. Loan / credit card minimum repayments [number]
51. Subscriptions and memberships [number]
52. Entertainment, dining out, hobbies [number]
53. Holidays (annual budget ÷ 12) [number]
54. Charitable giving [number]
55. Other regular outgoings [number — long text if itemised]

## E. Property

56. Do you own your home? [yes — sole | yes — joint | no]
57. Estimated current market value of main residence [number]
58. Date acquired [date]
59. Original purchase price [number]
60. Outstanding mortgage balance [number]
61. Mortgage lender [text]
62. Interest rate [number — %]
63. Fixed-rate end date [date]
64. Monthly mortgage payment [number]
65. Mortgage type [repayment | interest-only | offset | other]
66. Do you own additional property (BTL, holiday home, abroad)? [yes/no]
67. (Per additional property) Type [BTL | second home | holiday let | overseas]
68. (Per additional property) Address [text]
69. (Per additional property) Value, mortgage balance, monthly payment, gross rental [4 × number]

## F. Pensions

70. Workplace pension scheme(s) — for each: provider, current value, employer contribution %, employee contribution % [repeat]
71. Personal pensions / SIPPs — for each: provider, current value, monthly contribution [repeat]
72. Defined benefit (final salary) entitlements — scheme name, accrual rate, expected age & income, transfer value if known [repeat]
73. State Pension forecast obtained? [yes/no — amount per week if yes]
74. Any pensions previously transferred or considered for transfer? [yes/no — long text]
75. Repeat 70–74 for spouse / partner

## G. Investments & Savings

76. Cash held in current accounts [number]
77. Easy-access savings (incl. Cash ISA) — institution, balance, interest rate [repeat]
78. Fixed-rate savings — institution, balance, rate, maturity date [repeat]
79. Stocks & Shares ISA — provider, value, current contribution this tax year [repeat]
80. General Investment Account (GIA) — provider, value [repeat]
81. Unit trusts / OEICs / investment trusts held outside ISA/GIA wrappers [list]
82. Premium Bonds holding [number]
83. Crypto-asset holdings — exchange/wallet, asset, value [repeat]
84. Business interests — name, % owned, valuation [repeat]
85. Other significant assets (art, classic cars, jewellery) — description, estimated value [list]

## H. Debts & Liabilities

86. Credit cards — issuer, balance, APR, monthly payment [repeat]
87. Personal loans — lender, balance, rate, monthly payment, end date [repeat]
88. Car finance / HP — lender, balance, monthly payment, end date [repeat]
89. Student loans — plan type (1/2/4/5/postgrad), balance if known [repeat]
90. Family / informal loans — to whom owed, amount, repayment plan [repeat]
91. Any guarantees given (e.g. parental mortgage guarantor)? [yes/no — long text]

## I. Protection & Insurance

92. Term Life Assurance policies — for whom, sum assured, premium, end date, in trust? [repeat]
93. Whole-of-Life policies — same fields [repeat]
94. Income Protection — provider, monthly benefit, deferred period, ceasing age, premium [repeat]
95. Critical Illness Cover — sum assured, list of covered conditions, premium [repeat]
96. Private Medical Insurance — provider, members covered, monthly premium [repeat]
97. Buildings & Contents — provider, sums insured, premium [repeat]
98. Other cover (umbrella, personal liability, travel, gadget) [repeat]

## J. Estate Planning

99. Do you have a current Will? [yes — date | yes — out of date | no]
100. Do you have a Lasting Power of Attorney (Property & Financial Affairs)? [yes/no]
101. Do you have a Lasting Power of Attorney (Health & Welfare)? [yes/no]
102. Have you set up any trusts? [yes/no — long text if yes]
103. Have you made any gifts of £3k+ in the last 7 years? [yes/no — long text if yes]
104. Are any expected inheritances likely in the next 10 years? [yes/no — rough timing & amount]
105. Funeral plan in place? [yes/no]

## K. Goals & Priorities

106. Top three financial priorities, ranked [text × 3]
107. Target retirement age [number]
108. Desired post-retirement net monthly income (today's money) [number]
109. Education funding goals — for whom, when, expected annual cost, years [repeat]
110. House move / upsizing planned in the next 10 years? [yes/no — target year, target price]
111. Major capital purchases planned (car, holiday home, business) [repeat: what, when, cost]
112. Legacy / inheritance goals — to whom, target amount [repeat]
113. Charitable giving goals [text]
114. Anything else you want this plan to achieve? [long text]

## L. Attitude to Risk & Capacity for Loss

115. How would you describe your investment experience? [none | limited | moderate | extensive]
116. Have you previously held investments that fluctuated in value? [yes/no]
117. If your portfolio fell 20% in a year, would you [sell | hold | top up]?
118. How long can you leave the bulk of your investments untouched? [<3 yrs | 3–5 yrs | 5–10 yrs | 10+ yrs]
119. Could you absorb a 30% temporary fall without changing your lifestyle? [yes | maybe | no]
120. Pick the best description of your risk preference [cautious | balanced | growth | adventurous]

## M. Ethical & ESG Preferences (Optional)

121. Do you want to exclude any sectors (e.g. tobacco, fossil fuels, weapons)? [yes/no — long text]
122. Do you want a positive tilt toward sustainability themes? [yes/no — long text]
123. Are religious / ethical screens important (e.g. Sharia)? [yes/no — long text]

## N. Adviser Notes (Internal — Not for the Client)

124. Source of introduction [text]
125. Vulnerable client indicators — any concerns? [yes/no — long text]
126. Recommended next steps [long text]
127. Documents collected (passport, proof of address, KYC) [checklist]

---

## Mapping back into HouseholdMap

When the FlowScore quiz returns answers, the planned import will populate:

| Section | HouseholdMap entity |
|---|---|
| A, B           | `people[]` (name, age, retirementAge, notes) |
| C              | `cashflows[]` direction `in` (kind: salary, self-emp, ssi, investment) |
| D              | `cashflows[]` direction `out` (kinds: housing, utilities, food, etc.) |
| E              | `assets[]` (kind: realestate) + `liabilities[]` (kind: mortgage) |
| F              | `assets[]` (kind: sipp); ssi cashflow for State Pension |
| G              | `assets[]` (kinds: cash, savings, isa, brokerage, junior-isa, crypto, business, other-asset) |
| H              | `liabilities[]` (kinds: credit-card, personal, auto-loan, student-loan) |
| I              | `insurance[]` (kinds: life-term, life-perm, disability, health, home-ins) |
| J, K, L, M, N  | `assumptions`, `goals`, `events`, plus per-entity `notes` |

When wired, each FlowScore quiz response becomes one POST to a small import
endpoint that converts the answers into this shape and saves them on the
active client record.
