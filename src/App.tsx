import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { MarkupEditor } from "./components/MarkupEditor";
import { DiagramCanvas } from "./components/DiagramCanvas";
import { Toolbar } from "./components/Toolbar";
import {
  loadMarkup,
  saveMarkup,
  loadDrawerOpen,
  saveDrawerOpen,
  loadDiagrams,
  saveDiagrams,
  loadCurrentDiagramId,
  saveCurrentDiagramId,
  makeDiagramId,
  type SavedDiagrams,
} from "./lib/storage";
import { exportSvgToPdf } from "./lib/pdfExport";
import { exportSvgToPng } from "./lib/pngExport";
import { createHistory, historyReducer } from "./lib/history";

const DEFAULT_MARKUP = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Approved]
  B -->|No| D[Rejected]
  C --> E[Done]
  D --> E
`;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.2;
const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

export default function App() {
  const [state, dispatch] = useReducer(
    historyReducer,
    loadMarkup(DEFAULT_MARKUP),
    createHistory,
  );
  const markup = state.present;

  const [drawerOpen, setDrawerOpen] = useState<boolean>(() => loadDrawerOpen());
  const [zoom, setZoom] = useState<number>(1);
  const [diagrams, setDiagrams] = useState<SavedDiagrams>(() => loadDiagrams());
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(() =>
    loadCurrentDiagramId(),
  );
  const [status, setStatus] = useState<string>("");
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Persist scratch markup (only when no named diagram is open).
  useEffect(() => {
    if (currentDiagramId) return;
    const id = setTimeout(() => saveMarkup(markup), 200);
    return () => clearTimeout(id);
  }, [markup, currentDiagramId]);

  // Persist into the currently-open named diagram.
  useEffect(() => {
    if (!currentDiagramId) return;
    const id = setTimeout(() => {
      setDiagrams((prev) => {
        const entry = prev[currentDiagramId];
        if (!entry || entry.markup === markup) return prev;
        const next = {
          ...prev,
          [currentDiagramId]: {
            ...entry,
            markup,
            updatedAt: Date.now(),
          },
        };
        saveDiagrams(next);
        return next;
      });
    }, 300);
    return () => clearTimeout(id);
  }, [markup, currentDiagramId]);

  // Debounced checkpoint of textarea typing.
  useEffect(() => {
    const id = setTimeout(() => dispatch({ type: "CHECKPOINT" }), 500);
    return () => clearTimeout(id);
  }, [markup]);

  // Persist drawer state.
  useEffect(() => {
    saveDrawerOpen(drawerOpen);
  }, [drawerOpen]);

  // Persist current diagram id.
  useEffect(() => {
    saveCurrentDiagramId(currentDiagramId);
  }, [currentDiagramId]);

  // Global keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "REDO" : "UNDO" });
      } else if (key === "\\") {
        e.preventDefault();
        setDrawerOpen((v) => !v);
      } else if (key === "0") {
        e.preventDefault();
        setZoom(1);
      } else if (key === "=" || key === "+") {
        e.preventDefault();
        setZoom((z) => clampZoom(z * ZOOM_STEP));
      } else if (key === "-") {
        e.preventDefault();
        setZoom((z) => clampZoom(z / ZOOM_STEP));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSvgReady = useCallback((svg: SVGSVGElement | null) => {
    svgRef.current = svg;
  }, []);

  const handleTyping = useCallback((value: string) => {
    dispatch({ type: "SET_TYPING", value });
  }, []);

  const handleDiscrete = useCallback((value: string) => {
    dispatch({ type: "SET_DISCRETE", value });
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

  async function exportPng() {
    const svg = svgRef.current;
    if (!svg) {
      setStatus("Nothing to export yet.");
      return;
    }
    setStatus("Exporting PNG…");
    try {
      await exportSvgToPng(svg);
      setStatus("Exported.");
    } catch (e) {
      setStatus(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
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

  function handleNewDiagram() {
    handleDiscrete(DEFAULT_MARKUP);
    setCurrentDiagramId(null);
  }

  function handleOpenDiagram(id: string) {
    const entry = diagrams[id];
    if (!entry) return;
    handleDiscrete(entry.markup);
    setCurrentDiagramId(id);
  }

  function handleSaveAs(name: string) {
    const id = makeDiagramId();
    const entry = { id, name, markup, updatedAt: Date.now() };
    const next = { ...diagrams, [id]: entry };
    setDiagrams(next);
    saveDiagrams(next);
    setCurrentDiagramId(id);
  }

  function handleRename(id: string, name: string) {
    const entry = diagrams[id];
    if (!entry) return;
    const next = {
      ...diagrams,
      [id]: { ...entry, name, updatedAt: Date.now() },
    };
    setDiagrams(next);
    saveDiagrams(next);
  }

  function handleDelete(id: string) {
    const { [id]: _, ...rest } = diagrams;
    setDiagrams(rest);
    saveDiagrams(rest);
    if (currentDiagramId === id) setCurrentDiagramId(null);
  }

  return (
    <div className="app">
      <Toolbar
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((v) => !v)}
        diagrams={diagrams}
        currentDiagramId={currentDiagramId}
        onNewDiagram={handleNewDiagram}
        onOpenDiagram={handleOpenDiagram}
        onSaveAs={handleSaveAs}
        onRename={handleRename}
        onDelete={handleDelete}
        onImport={handleDiscrete}
        onExportMmd={downloadMmd}
        onExportPng={exportPng}
        onExportPdf={exportPdf}
        status={status}
      />
      <div className="panes">
        <MarkupEditor
          value={markup}
          onChange={handleTyping}
          collapsed={!drawerOpen}
        />
        <DiagramCanvas
          markup={markup}
          onMarkupChange={handleDiscrete}
          onSvgReady={handleSvgReady}
          zoom={zoom}
          onZoomChange={(z) => setZoom(clampZoom(z))}
        />
      </div>
    </div>
  );
}
