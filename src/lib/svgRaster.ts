interface RasterizeOptions {
  transparent?: boolean;
}

export async function rasterize(
  svgEl: SVGSVGElement,
  pxW: number,
  pxH: number,
  opts: RasterizeOptions = {},
): Promise<string> {
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
    if (!opts.transparent) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
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
