import { jsPDF } from "jspdf";

const PAGE_W = 13.333; // inches — PowerPoint 16:9 default
const PAGE_H = 7.5;
const MARGIN = 0.4;
const DPI = 300; // raster source DPI; PowerPoint typically renders at 96–150

export async function exportSvgToPdf(
  svgEl: SVGSVGElement,
  filename = `diagram-${Date.now()}.pdf`,
): Promise<void> {
  const { width: vbW, height: vbH } = getSvgSize(svgEl);
  const availW = PAGE_W - 2 * MARGIN;
  const availH = PAGE_H - 2 * MARGIN;
  const scale = Math.min(availW / vbW, availH / vbH);
  const drawW = vbW * scale;
  const drawH = vbH * scale;
  const x = (PAGE_W - drawW) / 2;
  const y = (PAGE_H - drawH) / 2;

  const pngDataUrl = await rasterize(svgEl, drawW * DPI, drawH * DPI);

  const doc = new jsPDF({
    unit: "in",
    format: [PAGE_W, PAGE_H],
    orientation: "landscape",
  });
  doc.addImage(pngDataUrl, "PNG", x, y, drawW, drawH, undefined, "FAST");
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

async function rasterize(
  svgEl: SVGSVGElement,
  pxW: number,
  pxH: number,
): Promise<string> {
  // Clone + set explicit width/height/xmlns so the SVG renders standalone
  // when loaded into an Image.
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(pxW));
  clone.setAttribute("height", String(pxH));

  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(pxW);
    canvas.height = Math.ceil(pxH);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load SVG into image"));
    img.src = url;
  });
}
