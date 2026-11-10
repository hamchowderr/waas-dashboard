import * as React from "react";

import { fillParts, type KitContext } from "@/lib/sales-kit";

/**
 * The small part of Markdown the sales kit uses (### headings, paragraphs, - and 1. lists, tables, **bold**),
 * with placeholders filled from `ctx` and the ones the seller fills in marked.
 */
export function KitMarkdown({ source, ctx }: { source: string; ctx: KitContext }) {
  return <div className="space-y-3 text-sm leading-relaxed">{blocks(source).map((b, i) => renderBlock(b, i, ctx))}</div>;
}

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] };

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

function blocks(source: string): Block[] {
  const out: Block[] = [];
  for (const chunk of source.trim().split(/\n\s*\n/)) {
    const lines = chunk.split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    const first = lines[0]!.trim();
    if (first.startsWith("### ")) {
      out.push({ type: "heading", text: first.slice(4) });
      if (lines.length > 1) out.push(...blocks(lines.slice(1).join("\n")));
    } else if (first.startsWith("|")) {
      const [head, , ...rows] = lines;
      out.push({ type: "table", head: cells(head!), rows: rows.map(cells) });
    } else if (/^(-|\d+\.)\s/.test(first)) {
      const ordered = /^\d+\./.test(first);
      const items: string[] = [];
      for (const line of lines) {
        const item = /^\s*(?:-|\d+\.)\s+(.*)$/.exec(line);
        if (item) items.push(item[1]!);
        else if (items.length) items[items.length - 1] += ` ${line.trim()}`;
      }
      out.push({ type: "list", ordered, items });
    } else {
      out.push({ type: "paragraph", text: lines.join("\n") });
    }
  }
  return out;
}

function renderBlock(block: Block, key: number, ctx: KitContext) {
  switch (block.type) {
    case "heading":
      return (
        <h3 key={key} className="pt-2 text-sm font-semibold">
          <Inline text={block.text} ctx={ctx} />
        </h3>
      );
    case "paragraph":
      return (
        <p key={key} className="whitespace-pre-line">
          <Inline text={block.text} ctx={ctx} />
        </p>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List key={key} className={`space-y-1.5 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} ctx={ctx} />
            </li>
          ))}
        </List>
      );
    }
    case "table":
      return (
        <div key={key} className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                {block.head.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-medium whitespace-nowrap">
                    <Inline text={h} ctx={ctx} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t">
                  {row.map((c, i) => (
                    <td key={i} className="px-3 py-2 whitespace-nowrap">
                      <Inline text={c} ctx={ctx} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Text with **bold** and placeholders; a placeholder the seller fills in shows as a dashed chip. */
export function Inline({ text, ctx }: { text: string; ctx: KitContext }) {
  return (
    <>
      {fillParts(text, ctx).map((part, i) =>
        part.blank ? (
          <span key={i} className="text-muted-foreground border-foreground/25 bg-muted/60 rounded border border-dashed px-1 text-[0.85em]">
            {part.text}
          </span>
        ) : (
          <React.Fragment key={i}>{bold(part.text)}</React.Fragment>
        )
      )}
    </>
  );
}

function bold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((piece, i) =>
    piece.startsWith("**") && piece.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {piece.slice(2, -2)}
      </strong>
    ) : (
      piece.replace(/`([^`]+)`/g, "$1")
    )
  );
}
