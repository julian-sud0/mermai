import { useEffect, useRef, useState } from "react";
import type { SavedDiagrams } from "../lib/storage";

interface Props {
  diagrams: SavedDiagrams;
  currentId: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onSaveAs: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function DiagramsMenu({
  diagrams,
  currentId,
  onNew,
  onOpen,
  onSaveAs,
  onRename,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const list = Object.values(diagrams).sort((a, b) => b.updatedAt - a.updatedAt);
  const current = currentId ? diagrams[currentId] : null;
  const label = current ? current.name : "Untitled";

  function handleSaveAs() {
    const name = window.prompt("Save diagram as:", current?.name ?? "Untitled");
    if (name && name.trim()) onSaveAs(name.trim());
    setOpen(false);
  }

  function handleRename(id: string, oldName: string) {
    const name = window.prompt("Rename diagram:", oldName);
    if (name && name.trim() && name.trim() !== oldName) onRename(id, name.trim());
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      onDelete(id);
    }
  }

  return (
    <div className="diagrams-menu" ref={rootRef}>
      <button onClick={() => setOpen((v) => !v)} title="Saved diagrams">
        {label} ▾
      </button>
      {open && (
        <div className="diagrams-dropdown">
          <button
            className="dd-item"
            onClick={() => {
              onNew();
              setOpen(false);
            }}
          >
            + New
          </button>
          <button className="dd-item" onClick={handleSaveAs}>
            Save As…
          </button>
          {list.length > 0 && <div className="dd-sep" />}
          {list.map((d) => (
            <div
              key={d.id}
              className={`dd-row${d.id === currentId ? " current" : ""}`}
            >
              <button
                className="dd-open"
                onClick={() => {
                  onOpen(d.id);
                  setOpen(false);
                }}
                title={new Date(d.updatedAt).toLocaleString()}
              >
                {d.name}
              </button>
              <button
                className="dd-icon"
                onClick={() => handleRename(d.id, d.name)}
                title="Rename"
              >
                ✎
              </button>
              <button
                className="dd-icon"
                onClick={() => handleDelete(d.id, d.name)}
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
