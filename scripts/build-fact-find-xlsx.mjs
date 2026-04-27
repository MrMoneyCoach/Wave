// Generates asset-map/UK-Fact-Find.xlsx from the same 127 questions in
// asset-map/FACT-FIND-UK.md. Zero dependencies — minimal XLSX writer
// using ZIP STORE (no compression) and inline strings.
import { writeFileSync } from "node:fs";

// ---------- Minimal ZIP writer ----------
const TBL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ TBL[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function makeZip(files) {
  const lhBufs = [], chBufs = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, "utf8");
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(0, 8);    // STORE
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    lhBufs.push(Buffer.concat([lh, name, data]));

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    chBufs.push(Buffer.concat([ch, name]));
    offset += 30 + name.length + data.length;
  }
  const lhBlock = Buffer.concat(lhBufs);
  const chBlock = Buffer.concat(chBufs);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(chBlock.length, 12);
  eocd.writeUInt32LE(lhBlock.length, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([lhBlock, chBlock, eocd]);
}

// ---------- Worksheet ----------
const escXml = (s) => String(s ?? "").replace(/[<>&"']/g, c =>
  ({"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&apos;"}[c]));
function colLetter(i) {
  let n = i + 1, s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function sheetXml(rows) {
  const body = rows.map((row, i) => {
    const cells = row.map((cell, j) => {
      const ref = colLetter(j) + (i + 1);
      if (cell == null || cell === "") return "";
      if (typeof cell === "number") return `<c r="${ref}"><v>${cell}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escXml(cell)}</t></is></c>`;
    }).join("");
    return `<row r="${i + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols>
<col min="1" max="1" width="42" customWidth="1"/>
<col min="2" max="2" width="6"  customWidth="1"/>
<col min="3" max="3" width="80" customWidth="1"/>
<col min="4" max="4" width="36" customWidth="1"/>
<col min="5" max="5" width="40" customWidth="1"/>
</cols>
<sheetData>${body}</sheetData>
</worksheet>`;
}

// ---------- Questions (sections A–N, 127 total) ----------
const Q = [];
const sec = (label, items) => {
  for (const [num, question, type, notes] of items)
    Q.push({ section: label, num, question, type, notes: notes || "" });
};

sec("A. About You & Your Household", [
  [1, "Your full name", "text"],
  [2, "Your date of birth", "date"],
  [3, "Your gender", "text (optional)"],
  [4, "Your marital status", "single | married | civil partnership | cohabiting | separated | divorced | widowed"],
  [5, "Your nationality and country of tax residence", "text"],
  [6, "Your home address (line 1, town/city, county, postcode)", "4 × text"],
  [7, "Best contact email", "email"],
  [8, "Best contact phone", "tel"],
  [9, "Do you have a spouse or partner whose finances should be included?", "yes/no"],
  [10, "Spouse / partner full name (if applicable)", "text"],
  [11, "Spouse / partner date of birth", "date"],
  [12, "Spouse / partner contact email", "email"],
  [13, "How many dependent children or other dependants do you have?", "number"],
  [14, "Per dependant: Name", "text", "Repeat for each dependant"],
  [15, "Per dependant: Date of birth", "date", "Repeat"],
  [16, "Per dependant: Relationship", "child | step-child | parent | other"],
  [17, "Per dependant: Are they financially dependent on you today?", "yes/no"],
  [18, "Do you currently support any non-dependent family members?", "yes/no — long text if yes"],
]);
sec("B. Health & Wellbeing", [
  [19, "Are you in good general health?", "yes/no — long text if no"],
  [20, "Do you currently smoke or vape nicotine?", "yes/no"],
  [21, "Have you smoked in the last 12 months?", "yes/no"],
  [22, "Any pre-existing medical conditions relevant to insurance?", "long text"],
  [23, "Does your spouse / partner answer the same on all of the above?", "yes/no — long text"],
]);
sec("C. Employment & Income", [
  [24, "Your employment status", "employed | self-employed | director | retired | not working"],
  [25, "Your employer or business name", "text"],
  [26, "Your job title", "text"],
  [27, "Your gross annual salary or drawings", "number — currency"],
  [28, "Frequency of pay", "monthly | 4-weekly | weekly | quarterly | annual"],
  [29, "Annual bonus expected (if any)", "number"],
  [30, "Other regular income (rental, dividends, freelance)", "number — annual"],
  [31, "State Pension currently being received?", "yes/no — amount per week if yes"],
  [32, "Other pension income in payment", "list: provider, gross annual, indexation"],
  [33, "Spouse / partner employment status, income, and pension in payment", "repeat 24–32"],
  [34, "Anticipated retirement age for you", "number"],
  [35, "Anticipated retirement age for spouse / partner", "number"],
]);
sec("D. Monthly Expenditure", [
  [36, "Mortgage or rent", "number"],
  [37, "Council tax", "number"],
  [38, "Utilities (gas, electric, water)", "number"],
  [39, "Telecoms (broadband, mobile, TV)", "number"],
  [40, "Food and household groceries", "number"],
  [41, "Transport (fuel, public transport, parking)", "number"],
  [42, "Car finance / lease", "number"],
  [43, "Vehicle insurance, road tax, MOT (avg / month)", "number"],
  [44, "Childcare / school fees / activities", "number"],
  [45, "Health (private medical, dental, optical)", "number"],
  [46, "Insurance premiums (life, income protection, etc.)", "number"],
  [47, "Pension contributions (personal — exclude employer's)", "number"],
  [48, "ISA / savings contributions", "number"],
  [49, "Junior ISA / Child Trust contributions", "number"],
  [50, "Loan / credit card minimum repayments", "number"],
  [51, "Subscriptions and memberships", "number"],
  [52, "Entertainment, dining out, hobbies", "number"],
  [53, "Holidays (annual budget ÷ 12)", "number"],
  [54, "Charitable giving", "number"],
  [55, "Other regular outgoings", "number — long text if itemised"],
]);
sec("E. Property", [
  [56, "Do you own your home?", "yes — sole | yes — joint | no"],
  [57, "Estimated current market value of main residence", "number"],
  [58, "Date acquired", "date"],
  [59, "Original purchase price", "number"],
  [60, "Outstanding mortgage balance", "number"],
  [61, "Mortgage lender", "text"],
  [62, "Interest rate (%)", "number"],
  [63, "Fixed-rate end date", "date"],
  [64, "Monthly mortgage payment", "number"],
  [65, "Mortgage type", "repayment | interest-only | offset | other"],
  [66, "Do you own additional property (BTL, holiday home, abroad)?", "yes/no"],
  [67, "Per additional property: Type", "BTL | second home | holiday let | overseas"],
  [68, "Per additional property: Address", "text"],
  [69, "Per additional property: Value, mortgage balance, monthly payment, gross rental", "4 × number"],
]);
sec("F. Pensions", [
  [70, "Workplace pensions — provider, current value, employer % , employee %", "list / repeat"],
  [71, "Personal pensions / SIPPs — provider, current value, monthly contribution", "list / repeat"],
  [72, "Defined-benefit entitlements — scheme, accrual rate, expected age & income, transfer value", "list / repeat"],
  [73, "State Pension forecast obtained?", "yes/no — amount per week if yes"],
  [74, "Any pensions previously transferred or considered for transfer?", "yes/no — long text"],
  [75, "Repeat 70–74 for spouse / partner", "section"],
]);
sec("G. Investments & Savings", [
  [76, "Cash held in current accounts", "number"],
  [77, "Easy-access savings (incl. Cash ISA)", "list: institution, balance, rate"],
  [78, "Fixed-rate savings", "list: institution, balance, rate, maturity"],
  [79, "Stocks & Shares ISA", "list: provider, value, this year's contribution"],
  [80, "General Investment Account (GIA)", "list: provider, value"],
  [81, "Unit trusts / OEICs / investment trusts outside ISA/GIA", "list"],
  [82, "Premium Bonds holding", "number"],
  [83, "Crypto-asset holdings", "list: exchange/wallet, asset, value"],
  [84, "Business interests", "list: name, % owned, valuation"],
  [85, "Other significant assets (art, classic cars, jewellery)", "list: description, estimated value"],
]);
sec("H. Debts & Liabilities", [
  [86, "Credit cards", "list: issuer, balance, APR, monthly payment"],
  [87, "Personal loans", "list: lender, balance, rate, monthly payment, end date"],
  [88, "Car finance / HP", "list: lender, balance, monthly payment, end date"],
  [89, "Student loans", "plan type (1/2/4/5/postgrad), balance if known"],
  [90, "Family / informal loans", "to whom owed, amount, repayment plan"],
  [91, "Any guarantees given (e.g. parental mortgage guarantor)?", "yes/no — long text"],
]);
sec("I. Protection & Insurance", [
  [92, "Term Life Assurance", "list: insured, sum assured, premium, end date, in trust?"],
  [93, "Whole-of-Life policies", "same fields as 92"],
  [94, "Income Protection", "list: provider, monthly benefit, deferred period, ceasing age, premium"],
  [95, "Critical Illness Cover", "list: sum assured, conditions covered, premium"],
  [96, "Private Medical Insurance", "list: provider, members covered, monthly premium"],
  [97, "Buildings & Contents", "list: provider, sums insured, premium"],
  [98, "Other cover (umbrella, personal liability, travel, gadget)", "list"],
]);
sec("J. Estate Planning", [
  [99, "Do you have a current Will?", "yes — date | yes — out of date | no"],
  [100, "Lasting Power of Attorney (Property & Financial Affairs)?", "yes/no"],
  [101, "Lasting Power of Attorney (Health & Welfare)?", "yes/no"],
  [102, "Have you set up any trusts?", "yes/no — long text"],
  [103, "Gifts of £3k+ in the last 7 years?", "yes/no — long text"],
  [104, "Expected inheritances in the next 10 years?", "yes/no — rough timing & amount"],
  [105, "Funeral plan in place?", "yes/no"],
]);
sec("K. Goals & Priorities", [
  [106, "Top three financial priorities, ranked", "text × 3"],
  [107, "Target retirement age", "number"],
  [108, "Desired post-retirement net monthly income (today's money)", "number"],
  [109, "Education funding goals", "list: for whom, when, expected annual cost, years"],
  [110, "House move / upsizing planned in the next 10 years?", "yes/no — target year, target price"],
  [111, "Major capital purchases planned (car, holiday home, business)", "list: what, when, cost"],
  [112, "Legacy / inheritance goals", "list: to whom, target amount"],
  [113, "Charitable giving goals", "text"],
  [114, "Anything else you want this plan to achieve?", "long text"],
]);
sec("L. Attitude to Risk & Capacity for Loss", [
  [115, "Investment experience", "none | limited | moderate | extensive"],
  [116, "Have you previously held investments that fluctuated in value?", "yes/no"],
  [117, "If your portfolio fell 20% in a year, would you", "sell | hold | top up"],
  [118, "How long can you leave the bulk of your investments untouched?", "<3 yrs | 3–5 yrs | 5–10 yrs | 10+ yrs"],
  [119, "Could you absorb a 30% temporary fall without changing your lifestyle?", "yes | maybe | no"],
  [120, "Best description of your risk preference", "cautious | balanced | growth | adventurous"],
]);
sec("M. Ethical & ESG Preferences", [
  [121, "Exclude any sectors (e.g. tobacco, fossil fuels, weapons)?", "yes/no — long text"],
  [122, "Positive tilt toward sustainability themes?", "yes/no — long text"],
  [123, "Religious / ethical screens important (e.g. Sharia)?", "yes/no — long text"],
]);
sec("N. Adviser Notes (Internal)", [
  [124, "Source of introduction", "text"],
  [125, "Vulnerable client indicators — any concerns?", "yes/no — long text"],
  [126, "Recommended next steps", "long text"],
  [127, "Documents collected (passport, proof of address, KYC)", "checklist"],
]);

// ---------- Build rows ----------
const rows = [["Section", "#", "Question", "Answer Type", "Notes"]];
for (const q of Q) rows.push([q.section, q.num, q.question, q.type, q.notes]);

// ---------- Assemble XLSX ----------
const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Fact Find" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

const xlsx = makeZip([
  { name: "[Content_Types].xml", data: contentTypes },
  { name: "_rels/.rels", data: rootRels },
  { name: "xl/workbook.xml", data: workbook },
  { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
  { name: "xl/worksheets/sheet1.xml", data: sheetXml(rows) },
]);

const out = "asset-map/UK-Fact-Find.xlsx";
writeFileSync(out, xlsx);
console.log(`Wrote ${out} (${xlsx.length} bytes, ${rows.length - 1} questions across ${new Set(Q.map(q => q.section)).size} sections)`);
