// Map a clicked SVG label back to its position in the mermaid source and
// replace it. We deliberately avoid relying on mermaid's internal AST.
//
// Strategy:
//   1. If we know the node id (parsed from the SVG element id, e.g.
//      "flowchart-A-0" -> "A"), look for `A[...]`, `A(...)`, `A{...}`,
//      `A>...]`, `A((...))`, `A[[...]]`, `A[(...)]`, etc.
//   2. Otherwise (edge labels, or unidentifiable nodes), fall back to
//      replacing the first textual match wrapped in label delimiters.

export interface EditTarget {
  nodeId: string | null;
  oldText: string;
}

const SHAPE_PATTERNS: Array<{ open: string; close: string }> = [
  { open: "[[", close: "]]" },
  { open: "[(", close: ")]" },
  { open: "((", close: "))" },
  { open: "[", close: "]" },
  { open: "(", close: ")" },
  { open: "{", close: "}" },
  { open: ">", close: "]" },
];

export function extractNodeId(svgElementId: string | null): string | null {
  if (!svgElementId) return null;
  // mermaid flowchart node ids look like "flowchart-<id>-<n>"
  const m = svgElementId.match(/^flowchart-(.+?)-\d+$/);
  if (m) return m[1];
  return null;
}

export function replaceLabel(
  markup: string,
  target: EditTarget,
  newText: string,
): string {
  if (target.nodeId) {
    const result = replaceNodeLabel(markup, target.nodeId, newText);
    if (result !== null) return result;
    // node had no explicit label (just `A`) — promote to `A[newText]`
    const promoted = promoteBareNode(markup, target.nodeId, newText);
    if (promoted !== null) return promoted;
  }
  // fallback: replace first label that matches oldText
  return replaceByText(markup, target.oldText, newText);
}

function replaceNodeLabel(
  markup: string,
  nodeId: string,
  newText: string,
): string | null {
  const idRe = new RegExp(`(^|[\\s;>\\-])(${escapeRegex(nodeId)})(\\S?)`, "g");
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(markup)) !== null) {
    const afterIdx = m.index + m[1].length + m[2].length;
    for (const { open, close } of SHAPE_PATTERNS) {
      if (markup.startsWith(open, afterIdx)) {
        const labelStart = afterIdx + open.length;
        const labelEnd = markup.indexOf(close, labelStart);
        if (labelEnd === -1) continue;
        return (
          markup.slice(0, labelStart) +
          escapeLabel(newText) +
          markup.slice(labelEnd)
        );
      }
    }
  }
  return null;
}

function promoteBareNode(
  markup: string,
  nodeId: string,
  newText: string,
): string | null {
  // Match the node id as a standalone token (not followed by a shape opener
  // or further identifier chars).
  const re = new RegExp(
    `(^|[\\s;>\\-|])(${escapeRegex(nodeId)})(?=$|[\\s;|\\-])`,
  );
  const m = re.exec(markup);
  if (!m) return null;
  const idx = m.index + m[1].length;
  return (
    markup.slice(0, idx + nodeId.length) +
    `[${escapeLabel(newText)}]` +
    markup.slice(idx + nodeId.length)
  );
}

function replaceByText(
  markup: string,
  oldText: string,
  newText: string,
): string {
  const candidates: Array<{ open: string; close: string }> = [
    ...SHAPE_PATTERNS,
    { open: "|", close: "|" }, // edge labels
  ];
  for (const { open, close } of candidates) {
    const needle = open + oldText + close;
    const idx = markup.indexOf(needle);
    if (idx !== -1) {
      return (
        markup.slice(0, idx + open.length) +
        escapeLabel(newText) +
        markup.slice(idx + open.length + oldText.length)
      );
    }
  }
  // Final fallback: plain occurrence (sequence message text, note text,
  // anything not wrapped in a recognised delimiter). Replaces the first
  // match only — collisions with identical labels elsewhere accepted.
  const idx = markup.indexOf(oldText);
  if (idx !== -1) {
    return markup.slice(0, idx) + newText + markup.slice(idx + oldText.length);
  }
  return markup;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeLabel(s: string): string {
  // If the label contains characters that would confuse mermaid's parser,
  // wrap in quotes. Mermaid supports "quoted" labels inside shapes.
  if (/["\[\](){}|]/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}
