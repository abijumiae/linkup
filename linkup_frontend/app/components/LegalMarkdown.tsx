import Link from "next/link";
import type { ReactNode } from "react";

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${index}`} className="font-semibold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const isInternal = href.startsWith("/");
        if (isInternal) {
          nodes.push(
            <Link
              key={`${keyPrefix}-link-${index}`}
              href={href}
              className="font-medium text-brand-primary underline decoration-brand-primary/30 underline-offset-2 hover:text-brand-primary-hover dark:text-brand-secondary dark:hover:text-brand-secondary-hover"
            >
              {label}
            </Link>,
          );
        } else {
          nodes.push(
            <a
              key={`${keyPrefix}-link-${index}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-primary underline decoration-brand-primary/30 underline-offset-2 hover:text-brand-primary-hover dark:text-brand-secondary dark:hover:text-brand-secondary-hover"
            >
              {label}
            </a>,
          );
        }
      }
    }

    lastIndex = match.index + token.length;
    index += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|");
}

function isTableSeparator(line: string): boolean {
  return /^\|\s*[-:| ]+\|\s*$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export default function LegalMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] = [];
  let blockIndex = 0;

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push(
      <ul
        key={`list-${blockIndex++}`}
        className="my-4 list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700 dark:text-slate-300"
      >
        {listItems.map((item, itemIndex) => (
          <li key={`item-${itemIndex}`}>{parseInline(item, `list-${itemIndex}`)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  const flushTable = () => {
    if (tableRows.length === 0) {
      return;
    }

    const [header, ...body] = tableRows;
    blocks.push(
      <div
        key={`table-${blockIndex++}`}
        className="my-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800"
      >
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900/80">
            <tr>
              {header.map((cell, cellIndex) => (
                <th
                  key={`head-${cellIndex}`}
                  className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white"
                >
                  {parseInline(cell, `th-${cellIndex}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
            {body.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`cell-${rowIndex}-${cellIndex}`}
                    className="px-4 py-3 text-slate-700 dark:text-slate-300"
                  >
                    {parseInline(cell, `td-${rowIndex}-${cellIndex}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (isTableRow(trimmed)) {
      flushList();
      if (isTableSeparator(trimmed)) {
        continue;
      }
      tableRows.push(parseTableRow(trimmed));
      continue;
    }

    flushTable();

    if (trimmed === "") {
      flushList();
      continue;
    }

    if (trimmed === "---") {
      flushList();
      blocks.push(
        <hr
          key={`hr-${blockIndex++}`}
          className="my-8 border-slate-200 dark:border-slate-800"
        />,
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1
          key={`h1-${blockIndex++}`}
          className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          {trimmed.slice(2)}
        </h1>,
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2
          key={`h2-${blockIndex++}`}
          className="mt-10 text-xl font-semibold tracking-tight text-slate-900 first:mt-0 dark:text-white"
        >
          {trimmed.slice(3)}
        </h2>,
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3
          key={`h3-${blockIndex++}`}
          className="mt-8 text-lg font-semibold text-slate-900 dark:text-white"
        >
          {trimmed.slice(4)}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    if (trimmed.startsWith("*") && trimmed.endsWith("*") && !trimmed.startsWith("**")) {
      flushList();
      blocks.push(
        <p
          key={`em-${blockIndex++}`}
          className="text-sm italic leading-7 text-slate-600 dark:text-slate-400"
        >
          {trimmed.slice(1, -1)}
        </p>,
      );
      continue;
    }

    flushList();
    blocks.push(
      <p
        key={`p-${blockIndex++}`}
        className="my-4 text-sm leading-7 text-slate-700 dark:text-slate-300"
      >
        {parseInline(trimmed, `p-${blockIndex}`)}
      </p>,
    );
  }

  flushList();
  flushTable();

  return <div className="legal-markdown space-y-1">{blocks}</div>;
}
