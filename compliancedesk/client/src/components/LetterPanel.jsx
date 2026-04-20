import { useMemo, useState } from 'react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

export default function LetterPanel({ text, isStreaming, onRegenerate, onEdit, clientName }) {
  const [copied, setCopied] = useState(false);

  const wordCount = useMemo(() => {
    return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [text]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = async () => {
    const paragraphs = text.split(/\n+/).map(
      (line) => new Paragraph({ children: [new TextRun({ text: line })] }),
    );
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const safeName = (clientName || 'suitability-letter').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    saveAs(blob, `${safeName}-suitability-letter.docx`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
              Drafting…
            </span>
          ) : (
            <span>{wordCount.toLocaleString()} words</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopy} disabled={!text} className="btn-secondary">
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={handleDownload} disabled={!text || isStreaming} className="btn-secondary">
            Download .docx
          </button>
          <button onClick={onEdit} disabled={isStreaming} className="btn-secondary">
            Edit inputs
          </button>
          <button onClick={onRegenerate} disabled={isStreaming} className="btn-primary">
            Regenerate
          </button>
        </div>
      </div>

      <article className="bg-white rounded-xl shadow-document border border-slate-200 px-6 sm:px-10 py-8 sm:py-12 font-serif text-[15px] leading-7 text-slate-800 whitespace-pre-wrap min-h-[420px]">
        {text || (isStreaming ? '' : 'Your letter will appear here.')}
        {isStreaming && <span className="inline-block w-1 h-5 align-middle bg-navy-800 animate-pulse ml-1" />}
      </article>
    </div>
  );
}
