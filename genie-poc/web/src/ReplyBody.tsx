import type { ReactNode } from "react";

function inlineFmt(s: string): ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.filter(Boolean).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("`") && p.endsWith("`")) {
      return <code key={i}>{p.slice(1, -1)}</code>;
    }
    return <span key={i}>{p}</span>;
  });
}

export default function ReplyBody({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      blocks.push(
        <h3 key={k++} className="reply-h">
          {inlineFmt(line.replace(/^#{1,3}\s/, ""))}
        </h3>,
      );
      i += 1;
      continue;
    }
    if (/^\s*[-•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-•]\s/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={k++} className="reply-ul">
          {items.map((item, j) => (
            <li key={j}>{inlineFmt(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+[.)]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={k++} className="reply-ol">
          {items.map((item, j) => (
            <li key={j}>{inlineFmt(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^\s*[-•]\s/.test(lines[i]) &&
      !/^\s*\d+[.)]\s/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={k++} className="reply-p">
        {para.map((p, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {inlineFmt(p)}
          </span>
        ))}
      </p>,
    );
  }

  return <div className="ask-reply">{blocks}</div>;
}
