import { useRef } from "react";

interface Props {
  onImport: (markup: string) => void;
  onExportMmd: () => void;
  onExportPdf: () => void;
  status?: string;
}

export function Toolbar({ onImport, onExportMmd, onExportPdf, status }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="toolbar">
      <h1>mermai</h1>
      <button onClick={() => fileInput.current?.click()}>Import .mmd</button>
      <input
        ref={fileInput}
        type="file"
        accept=".mmd,.txt,text/plain"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          onImport(await f.text());
          e.target.value = "";
        }}
      />
      <button onClick={onExportMmd}>Export .mmd</button>
      <button onClick={onExportPdf}>Export PDF</button>
      {status && <span className="status">{status}</span>}
    </div>
  );
}
