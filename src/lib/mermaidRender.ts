import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
});

let counter = 0;

export async function renderToSvg(markup: string): Promise<string> {
  const id = `mermai-${++counter}`;
  const { svg } = await mermaid.render(id, markup);
  return svg;
}
