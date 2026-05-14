import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  // svg2pdf.js does not render <foreignObject>, so force plain <text> output.
  htmlLabels: false,
  flowchart: { htmlLabels: false },
  fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
});

let counter = 0;

export async function renderToSvg(markup: string): Promise<string> {
  const id = `mermai-${++counter}`;
  const { svg } = await mermaid.render(id, markup);
  return svg;
}
