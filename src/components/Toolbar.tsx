import { useRef } from "react";
import { DiagramsMenu } from "./DiagramsMenu";
import type { SavedDiagrams } from "../lib/storage";

interface Props {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  diagrams: SavedDiagrams;
  currentDiagramId: string | null;
  onNewDiagram: () => void;
  onOpenDiagram: (id: string) => void;
  onSaveAs: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onImport: (markup: string) => void;
  onExportMmd: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  status?: string;
}

export function Toolbar(props: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="toolbar">
      <button
        className="drawer-toggle"
        onClick={props.onToggleDrawer}
        title={props.drawerOpen ? "Hide editor (⌘\\)" : "Show editor (⌘\\)"}
      >
        {props.drawerOpen ? "‹" : "›"}
      </button>
      <h1>mermai</h1>
      <DiagramsMenu
        diagrams={props.diagrams}
        currentId={props.currentDiagramId}
        onNew={props.onNewDiagram}
        onOpen={props.onOpenDiagram}
        onSaveAs={props.onSaveAs}
        onRename={props.onRename}
        onDelete={props.onDelete}
      />
      <button onClick={() => fileInput.current?.click()}>Import .mmd</button>
      <input
        ref={fileInput}
        type="file"
        accept=".mmd,.txt,text/plain"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          props.onImport(await f.text());
          e.target.value = "";
        }}
      />
      <button onClick={props.onExportMmd}>Export .mmd</button>
      <button onClick={props.onExportPng}>Export PNG</button>
      <button onClick={props.onExportPdf}>Export PDF</button>
      {props.status && <span className="status">{props.status}</span>}
    </div>
  );
}
