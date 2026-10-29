import type { ReactNode } from "react";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const elements = parseMarkdown(content);
  return <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-[#141C16]">{elements}</div>;
}

function parseMarkdown(text: string): ReactNode[] {
  if (!text) return [];

  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableLines: string[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === "ul") {
        nodes.push(
          <ul key={`ul-${nodes.length}`} className="my-2 space-y-1.5 pl-5 list-disc text-[#141C16]/90 marker:text-[#22C55E]">
            {currentList.items.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ul>
        );
      } else {
        nodes.push(
          <ol key={`ol-${nodes.length}`} className="my-2 space-y-1.5 pl-5 list-decimal text-[#141C16]/90 marker:font-semibold marker:text-[#6C7A70]">
            {currentList.items.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  const flushTable = () => {
    if (tableLines.length > 0) {
      nodes.push(renderTable(tableLines, `table-${nodes.length}`));
      tableLines = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        nodes.push(
          <pre
            key={`code-${nodes.length}`}
            className="my-3 overflow-x-auto rounded-xl bg-[#121A15] p-3.5 font-mono text-xs text-[#EFF3F0] border border-white/10"
          >
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Tables
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      inTable = true;
      tableLines.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      nodes.push(
        <h4 key={`h4-${nodes.length}`} className="mt-3.5 mb-1 font-sans text-xs sm:text-sm font-bold text-[#141C16] tracking-tight">
          {formatInline(trimmed.replace(/^###\s+/, ""))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      nodes.push(
        <h3 key={`h3-${nodes.length}`} className="mt-4 mb-1.5 font-sans text-sm sm:text-base font-bold text-[#141C16] tracking-tight">
          {formatInline(trimmed.replace(/^##\s+/, ""))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      nodes.push(
        <h2 key={`h2-${nodes.length}`} className="mt-4 mb-2 font-sans text-base sm:text-lg font-bold text-[#141C16] tracking-tight">
          {formatInline(trimmed.replace(/^#\s+/, ""))}
        </h2>
      );
      continue;
    }

    // Blockquote / Key Takeaway / Insight Callout
    if (trimmed.startsWith("> ")) {
      flushList();
      nodes.push(
        <blockquote
          key={`quote-${nodes.length}`}
          className="my-2.5 rounded-xl border-l-2 border-[#22C55E] bg-[#EFF3F0]/60 px-3.5 py-2 text-xs text-[#141C16] italic"
        >
          {formatInline(trimmed.replace(/^>\s+/, ""))}
        </blockquote>
      );
      continue;
    }

    // Unordered List
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(ulMatch[1]);
      continue;
    }

    // Ordered List
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    flushList();

    if (!trimmed) {
      continue;
    }

    // Standard paragraph
    nodes.push(
      <p key={`p-${nodes.length}`} className="text-[#141C16]/90">
        {formatInline(trimmed)}
      </p>
    );
  }

  flushList();
  flushTable();

  return nodes;
}

function renderTable(tableLines: string[], key: string): ReactNode {
  if (tableLines.length < 2) return null;
  const parseRow = (line: string) =>
    line
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());

  const headers = parseRow(tableLines[0]);
  const rows = tableLines.slice(2).map(parseRow);

  return (
    <div key={key} className="my-3 overflow-x-auto rounded-xl border border-[#DCE4DF] bg-white shadow-2xs">
      <table className="min-w-full divide-y divide-[#DCE4DF] text-xs">
        <thead className="bg-[#EFF3F0]/60 font-semibold text-[#141C16]">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-sans font-bold text-[#141C16]">
                {formatInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EFF3F0] bg-white text-[#141C16]/90">
          {rows.map((row, rIndex) => (
            <tr key={rIndex} className="hover:bg-[#EFF3F0]/40 transition-colors">
              {row.map((cell, cIndex) => (
                <td key={cIndex} className="px-3 py-2">
                  {formatInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-[#141C16]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="rounded-md bg-[#EFF3F0] px-1.5 py-0.5 font-mono text-[11px] text-[#141C16] font-medium border border-[#DCE4DF]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}
