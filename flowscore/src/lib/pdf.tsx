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
const BRAND_DARK = "#1f3087";
const BRAND_TINT = "#eef4ff";
const SLATE_50 = "#f8fafc";
const SLATE_100 = "#f1f5f9";
const SLATE_200 = "#e2e8f0";
const SLATE_500 = "#64748b";
const SLATE_600 = "#475569";
const SLATE_700 = "#334155";
const SLATE_900 = "#0f172a";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: SLATE_900,
    lineHeight: 1.5,
    paddingBottom: 48,
  },

  hero: {
    backgroundColor: BRAND_DARK,
    padding: 32,
    paddingTop: 36,
    paddingBottom: 36,
    color: "#ffffff",
  },
  heroEyebrow: {
    fontSize: 9,
    color: "#c7d3ff",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    marginBottom: 6,
  },
  heroMeta: { fontSize: 10, color: "#c7d3ff" },

  body: { paddingHorizontal: 40, paddingTop: 28 },

  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  scoreText: { marginLeft: 24, flex: 1 },
  scoreNumber: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    color: SLATE_900,
    lineHeight: 1.1,
  },
  scoreSub: { fontSize: 10, color: SLATE_500, marginTop: 4 },

  outcomeCard: {
    backgroundColor: BRAND_TINT,
    borderLeftWidth: 4,
    borderLeftColor: BRAND,
    padding: 18,
    marginBottom: 24,
  },
  outcomeEyebrow: {
    fontSize: 9,
    color: BRAND_DARK,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  outcomeTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: BRAND_DARK,
    marginBottom: 6,
  },
  outcomeBody: { fontSize: 11, color: SLATE_700 },

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
    bottom: 18,
    left: 40,
    right: 40,
    fontSize: 8,
    color: SLATE_500,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: SLATE_100,
  },
});

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
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero} fixed={false}>
          {data.logoUrl && (
            <View style={{ marginBottom: 14 }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={data.logoUrl} style={{ height: 28, width: "auto" }} />
            </View>
          )}
          <Text style={styles.heroEyebrow}>Flowscore report</Text>
          <Text style={styles.heroTitle}>{data.quizTitle}</Text>
          <Text style={styles.heroMeta}>
            {fullName || r.email} · {data.completedAt.toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.scoreRow}>
            <ScoreDial percent={data.scorePercent} brand={brand} />
            <View style={styles.scoreText}>
              <Text style={styles.scoreNumber}>{data.scorePercent.toFixed(1)}%</Text>
              <Text style={styles.scoreSub}>
                {data.score.toFixed(1)} of {data.maxScore.toFixed(1)} points
              </Text>
            </View>
          </View>

          {data.outcomeTitle && (
            <View style={[styles.outcomeCard, { borderLeftColor: brand }]}>
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
            Report generated by Flowscore
            {data.ownerName ? ` for ${data.ownerName}` : ""}.
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
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

export async function generatePdfBuffer(data: PdfData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
