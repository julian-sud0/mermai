import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";

const PAGE_W = 13.333; // inches — PowerPoint 16:9 default
const PAGE_H = 7.5;
const MARGIN = 0.4;

export async function exportSvgToPdf(
  svgEl: SVGSVGElement,
  filename = `diagram-${Date.now()}.pdf`,
): Promise<void> {
  const doc = new jsPDF({
    unit: "in",
    format: [PAGE_W, PAGE_H],
    orientation: "landscape",
  });

  const { width: vbW, height: vbH } = getSvgSize(svgEl);
  const availW = PAGE_W - 2 * MARGIN;
  const availH = PAGE_H - 2 * MARGIN;
  const scale = Math.min(availW / vbW, availH / vbH);
  const drawW = vbW * scale;
  const drawH = vbH * scale;
  const x = (PAGE_W - drawW) / 2;
  const y = (PAGE_H - drawH) / 2;

  // svg2pdf renders the SVG into the jsPDF document as vector graphics.
  await svg2pdf(svgEl, doc, {
    x,
    y,
    width: drawW,
    height: drawH,
  });

  doc.save(filename);
}

function getSvgSize(svg: SVGSVGElement): { width: number; height: number } {
  const vb = svg.viewBox.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    return { width: vb.width, height: vb.height };
  }
  const r = svg.getBoundingClientRect();
  return { width: r.width || 800, height: r.height || 600 };
}
