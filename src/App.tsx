import { useCallback, useEffect, useRef, useState } from "react";
import { MarkupEditor } from "./components/MarkupEditor";
import { DiagramCanvas } from "./components/DiagramCanvas";
import { Toolbar } from "./components/Toolbar";
import { loadMarkup, saveMarkup } from "./lib/storage";
import { exportSvgToPdf } from "./lib/pdfExport";

const DEFAULT_MARKUP = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Approved]
  B -->|No| D[Rejected]
  C --> E[Done]
  D --> E
`;

export default function App() {
  const [markup, setMarkup] = useState<string>(() =>
    loadMarkup(DEFAULT_MARKUP),
  );
  const [status, setStatus] = useState<string>("");
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const id = setTimeout(() => saveMarkup(markup), 200);
    return () => clearTimeout(id);
  }, [markup]);

  const handleSvgReady = useCallback((svg: SVGSVGElement | null) => {
    svgRef.current = svg;
  }, []);

  function downloadMmd() {
    const blob = new Blob([markup], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${Date.now()}.mmd`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    const svg = svgRef.current;
    if (!svg) {
      setStatus("Nothing to export yet.");
      return;
    }
    setStatus("Exporting PDF…");
    try {
      await exportSvgToPdf(svg);
      setStatus("Exported.");
    } catch (e) {
      setStatus(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="app">
      <Toolbar
        onImport={setMarkup}
        onExportMmd={downloadMmd}
        onExportPdf={exportPdf}
        status={status}
      />
      <div className="panes">
        <MarkupEditor value={markup} onChange={setMarkup} />
        <DiagramCanvas
          markup={markup}
          onMarkupChange={setMarkup}
          onSvgReady={handleSvgReady}
        />
      </div>
    </div>
  );
}
