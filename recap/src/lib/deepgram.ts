import { createClient } from "@deepgram/sdk";

/**
 * Group Deepgram word-level diarization output into one row per utterance
 * (contiguous run of words from a single speaker).
 */
export type DeepgramWord = {
  word: string;
  punctuated_word?: string;
  start: number;
  end: number;
  speaker?: number;
};

export type Utterance = {
  speaker: number;
  start: number;
  end: number;
  text: string;
};

export function utterancesFromWords(words: DeepgramWord[]): Utterance[] {
  const out: Utterance[] = [];
  let current: Utterance | null = null;
  for (const w of words) {
    const speaker = w.speaker ?? 0;
    const token = w.punctuated_word ?? w.word;
    if (!current || current.speaker !== speaker) {
      if (current) out.push(current);
      current = { speaker, start: w.start, end: w.end, text: token };
    } else {
      current.end = w.end;
      current.text += ` ${token}`;
    }
  }
  if (current) out.push(current);
  return out;
}

export async function transcribeFromUrl(audioUrl: string) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY is not configured");

  const dg = createClient(apiKey);
  const { result, error } = await dg.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    {
      model: "nova-3",
      smart_format: true,
      punctuate: true,
      diarize: true,
      utterances: false,
      paragraphs: false,
      detect_language: true,
    },
  );
  if (error) throw new Error(`Deepgram error: ${error.message ?? String(error)}`);

  const channel = result?.results?.channels?.[0];
  const alt = channel?.alternatives?.[0];
  if (!alt) throw new Error("Deepgram returned no alternatives");

  const words = (alt.words ?? []) as DeepgramWord[];
  const utterances = utterancesFromWords(words);
  const transcriptText = alt.transcript ?? utterances.map((u) => u.text).join(" ");
  const duration = result?.metadata?.duration ?? null;
  const language = channel?.detected_language ?? "en";

  return { utterances, transcriptText, duration, language };
}
