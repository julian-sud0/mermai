import { rasterize } from "./svgRaster";

const PADDING = 16;
const DPI_SCALE = 2;

export async function exportSvgToPng(
  svgEl: SVGSVGElement,
  filename = `diagram-${Date.now()}.png`,
): Promise<void> {
  const bbox = svgEl.getBBox();
  const vbX = bbox.x - PADDING;
  const vbY = bbox.y - PADDING;
  const vbW = bbox.width + PADDING * 2;
  const vbH = bbox.height + PADDING * 2;

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);

  const pxW = vbW * DPI_SCALE;
  const pxH = vbH * DPI_SCALE;

  const dataUrl = await rasterize(clone, pxW, pxH, { transparent: true });

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
