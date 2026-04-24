import crypto from "crypto";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set");
  return s;
}

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function signPdfToken(submissionId: string): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const body = `${submissionId}.${exp}`;
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${exp}.${sig}`;
}

export function verifyPdfToken(submissionId: string, token: string): boolean {
  const [expRaw, sig] = token.split(".");
  if (!expRaw || !sig) return false;
  const exp = parseInt(expRaw, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto
    .createHmac("sha256", secret())
    .update(`${submissionId}.${exp}`)
    .digest("base64url");
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
