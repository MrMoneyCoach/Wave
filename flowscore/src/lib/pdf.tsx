import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Circle,
  Path,
  Link,
  renderToBuffer,
} from "@react-pdf/renderer";

const BRAND = "#345ff2";
const BRAND_TINT = "#eef4ff";
const SLATE_50 = "#f8fafc";
const SLATE_100 = "#f1f5f9";
const SLATE_200 = "#e2e8f0";
const SLATE_500 = "#64748b";
const SLATE_600 = "#475569";
const SLATE_700 = "#334155";
const SLATE_900 = "#0f172a";

function pickTextOnHex(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "#ffffff";
  const r = parseInt(m.substr(0, 2), 16);
  const g = parseInt(m.substr(2, 2), 16);
  const b = parseInt(m.substr(4, 2), 16);
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  return luma > 155 ? SLATE_900 : "#ffffff";
}

function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = parseInt(m.substr(0, 2), 16);
  const g = parseInt(m.substr(2, 2), 16);
  const b = parseInt(m.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: SLATE_900,
    lineHeight: 1.5,
    paddingBottom: 48,
  },

  hero: {
    backgroundColor: BRAND,
    paddingHorizontal: 40,
    paddingTop: 44,
    paddingBottom: 40,
    color: "#ffffff",
  },
  heroEyebrow: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    marginBottom: 8,
    lineHeight: 1.2,
  },
  heroMeta: { fontSize: 10 },
  heroRule: {
    height: 2,
    width: 36,
    marginTop: 18,
  },

  body: { paddingHorizontal: 40, paddingTop: 32 },

  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  scoreText: { marginLeft: 28, flex: 1 },
  scoreNumber: {
    fontSize: 48,
    fontFamily: "Helvetica-Bold",
    color: SLATE_900,
    lineHeight: 1,
    letterSpacing: -1,
  },
  scoreSub: { fontSize: 10, color: SLATE_500, marginTop: 6 },
  scoreLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: SLATE_500,
    marginBottom: 4,
  },

  outcomeCard: {
    backgroundColor: BRAND_TINT,
    borderLeftWidth: 4,
    borderLeftColor: BRAND,
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 28,
    borderRadius: 4,
  },
  outcomeEyebrow: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  outcomeTitle: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  outcomeBody: { fontSize: 11, color: SLATE_700, lineHeight: 1.55 },

  sectionHeading: {
    fontSize: 9,
    color: SLATE_500,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 14,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
  },

  detailsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  detail: { width: "50%", marginBottom: 10, paddingRight: 10 },
  detailLabel: {
    fontSize: 8,
    color: SLATE_500,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  detailValue: { fontSize: 11, color: SLATE_900 },

  answer: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: SLATE_50,
    padding: 10,
    borderRadius: 4,
  },
  answerNum: {
    backgroundColor: BRAND,
    color: "#ffffff",
    width: 22,
    height: 22,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 5,
    borderRadius: 11,
    marginRight: 10,
  },
  answerBody: { flex: 1 },
  answerQ: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: SLATE_900,
    marginBottom: 3,
  },
  answerA: { fontSize: 10.5, color: SLATE_700 },
  answerEmpty: { fontStyle: "italic", color: SLATE_500 },

  cta: {
    marginTop: 18,
    backgroundColor: BRAND,
    padding: 16,
    color: "#ffffff",
    borderRadius: 6,
  },
  ctaEyebrow: {
    fontSize: 9,
    color: "#c7d3ff",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  ctaTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    marginBottom: 6,
  },
  ctaLink: { fontSize: 11, color: "#ffffff" },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: SLATE_500,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SLATE_100,
  },
  footerAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
});

export type PdfBlock =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3 }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "list"; items: string[]; checkmark: boolean }
  | { id: string; type: "button"; label: string; url: string; style: "primary" | "secondary" }
  | { id: string; type: "divider" };

export type PdfData = {
  quizTitle: string;
  ownerName: string | null;
  bookingUrl: string | null;
  bookingLabel: string | null;
  brandColor: string | null;
  logoUrl: string | null;
  respondent: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    jobTitle: string;
  };
  scorePercent: number;
  score: number;
  maxScore: number;
  outcomeTitle?: string;
  outcomeDescription?: string;
  answers: { question: string; answer: string }[];
  completedAt: Date;
  /** Optional custom body blocks. If non-empty, these replace the
   *  built-in 'Your answers' section in the report. */
  bodyBlocks?: PdfBlock[];
};

function ScoreDial({ percent, brand }: { percent: number; brand: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = 50;
  const cx = 60;
  const cy = 60;
  if (clamped >= 100) {
    return (
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Circle cx={cx} cy={cy} r={r} stroke={brand} strokeWidth={10} fill="none" />
      </Svg>
    );
  }
  const angle = (clamped / 100) * 2 * Math.PI;
  const endX = cx + r * Math.sin(angle);
  const endY = cy - r * Math.cos(angle);
  const largeArc = angle > Math.PI ? 1 : 0;
  const arcPath = `M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Circle cx={cx} cy={cy} r={r} stroke={SLATE_200} strokeWidth={10} fill="none" />
      {clamped > 0 && (
        <Path
          d={arcPath}
          stroke={brand}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </Svg>
  );
}

function ReportDocument({ data }: { data: PdfData }) {
  const r = data.respondent;
  const fullName = [r.firstName, r.lastName].filter(Boolean).join(" ");
  const brand = (data.brandColor || BRAND).trim();
  const onBrand = pickTextOnHex(brand);
  const heroSoft = onBrand === "#ffffff" ? withAlpha("#ffffff", 0.78) : withAlpha(SLATE_900, 0.7);
  const heroRule = onBrand === "#ffffff" ? withAlpha("#ffffff", 0.5) : withAlpha(SLATE_900, 0.35);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.hero, { backgroundColor: brand }]} fixed={false}>
          {data.logoUrl && (
            <View style={{ marginBottom: 18 }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={data.logoUrl} style={{ height: 30, width: "auto" }} />
            </View>
          )}
          <Text style={[styles.heroEyebrow, { color: heroSoft }]}>
            Personalised scorecard report
          </Text>
          <Text style={[styles.heroTitle, { color: onBrand }]}>{data.quizTitle}</Text>
          <Text style={[styles.heroMeta, { color: heroSoft }]}>
            {fullName || r.email} · {formatLongDate(data.completedAt)}
          </Text>
          <View style={[styles.heroRule, { backgroundColor: heroRule }]} />
        </View>

        <View style={styles.body}>
          <View style={styles.scoreRow}>
            <ScoreDial percent={data.scorePercent} brand={brand} />
            <View style={styles.scoreText}>
              <Text style={styles.scoreLabel}>Your score</Text>
              <Text style={styles.scoreNumber}>{data.scorePercent.toFixed(1)}%</Text>
              <Text style={styles.scoreSub}>
                {data.score.toFixed(1)} of {data.maxScore.toFixed(1)} points
              </Text>
            </View>
          </View>

          {data.outcomeTitle && (
            <View style={[styles.outcomeCard, { borderLeftColor: brand, backgroundColor: withAlpha(brand, 0.08) }]}>
              <Text style={[styles.outcomeEyebrow, { color: brand }]}>
                Your outcome
              </Text>
              <Text style={[styles.outcomeTitle, { color: brand }]}>
                {data.outcomeTitle}
              </Text>
              {data.outcomeDescription && (
                <Text style={styles.outcomeBody}>{data.outcomeDescription}</Text>
              )}
            </View>
          )}

          <Text style={styles.sectionHeading}>Your details</Text>
          <View style={styles.detailsGrid}>
            <Detail label="Name" value={fullName} />
            <Detail label="Email" value={r.email} />
            {r.phone && <Detail label="Phone" value={r.phone} />}
            {r.company && <Detail label="Company" value={r.company} />}
            {r.jobTitle && <Detail label="Role" value={r.jobTitle} />}
          </View>

          {data.bodyBlocks && data.bodyBlocks.length > 0 ? (
            <PdfBlocks blocks={data.bodyBlocks} brand={brand} />
          ) : (
            <>
              <Text style={styles.sectionHeading}>Your answers</Text>
              {data.answers.map((a, i) => (
                <View key={i} style={styles.answer} wrap={false}>
                  <Text style={[styles.answerNum, { backgroundColor: brand }]}>
                    {i + 1}
                  </Text>
                  <View style={styles.answerBody}>
                    <Text style={styles.answerQ}>{a.question}</Text>
                    {a.answer ? (
                      <Text style={styles.answerA}>{a.answer}</Text>
                    ) : (
                      <Text style={[styles.answerA, styles.answerEmpty]}>Not answered</Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {data.bookingUrl && (
            <View style={[styles.cta, { backgroundColor: brand }]}>
              <Text style={styles.ctaEyebrow}>Next step</Text>
              <Text style={styles.ctaTitle}>
                {data.bookingLabel ||
                  (data.ownerName ? `Book a call with ${data.ownerName}` : "Book a call")}
              </Text>
              <Link src={data.bookingUrl} style={styles.ctaLink}>
                {data.bookingUrl} →
              </Link>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {data.ownerName ? `${data.ownerName} · ` : ""}Generated with Flowscore
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
        <View style={[styles.footerAccent, { backgroundColor: brand }]} fixed />
      </Page>
    </Document>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  );
}

const blockStyles = StyleSheet.create({
  h1: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: SLATE_900,
    marginBottom: 8,
    marginTop: 6,
  },
  h2: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: SLATE_900,
    marginBottom: 6,
    marginTop: 4,
  },
  h3: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: SLATE_900,
    marginBottom: 4,
    marginTop: 4,
  },
  p: {
    fontSize: 11,
    color: SLATE_700,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  listRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  bullet: {
    width: 12,
    fontSize: 11,
    color: SLATE_500,
  },
  check: {
    width: 14,
    height: 14,
    borderRadius: 7,
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 2,
    marginRight: 6,
  },
  listItem: {
    flex: 1,
    fontSize: 11,
    color: SLATE_700,
    lineHeight: 1.5,
  },
  buttonPrimary: {
    backgroundColor: BRAND,
    color: "#ffffff",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 8,
    textDecoration: "none",
  },
  buttonSecondary: {
    color: BRAND,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 14,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 8,
    textDecoration: "none",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
    marginTop: 8,
    marginBottom: 8,
  },
  pdfImage: {
    width: "100%",
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 4,
  },
});

function PdfBlocks({ blocks, brand }: { blocks: PdfBlock[]; brand: string }) {
  return (
    <View>
      {blocks.map((b) => (
        <PdfBlock key={b.id} block={b} brand={brand} />
      ))}
    </View>
  );
}

function PdfBlock({ block, brand }: { block: PdfBlock; brand: string }) {
  if (block.type === "heading") {
    const style =
      block.level === 1
        ? blockStyles.h1
        : block.level === 2
        ? blockStyles.h2
        : blockStyles.h3;
    return <Text style={style}>{block.text}</Text>;
  }
  if (block.type === "paragraph") {
    return <Text style={blockStyles.p}>{block.text}</Text>;
  }
  if (block.type === "image") {
    if (!block.url) return null;
    return (
      // eslint-disable-next-line jsx-a11y/alt-text
      <Image src={block.url} style={blockStyles.pdfImage} />
    );
  }
  if (block.type === "list") {
    const items = block.items.filter((s) => s.trim().length > 0);
    if (items.length === 0) return null;
    return (
      <View style={{ marginBottom: 6 }}>
        {items.map((item, i) => (
          <View key={i} style={blockStyles.listRow}>
            {block.checkmark ? (
              <Text style={[blockStyles.check, { backgroundColor: brand }]}>
                ✓
              </Text>
            ) : (
              <Text style={blockStyles.bullet}>•</Text>
            )}
            <Text style={blockStyles.listItem}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (block.type === "button") {
    if (!block.label || !block.url) return null;
    const style =
      block.style === "primary"
        ? [blockStyles.buttonPrimary, { backgroundColor: brand }]
        : [blockStyles.buttonSecondary, { color: brand, borderColor: brand }];
    return (
      <Link src={block.url} style={style}>
        {block.label}
      </Link>
    );
  }
  if (block.type === "divider") {
    return <View style={blockStyles.divider} />;
  }
  return null;
}

export async function generatePdfBuffer(data: PdfData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
