import { useEffect, useRef, useState } from "react";
import { renderToSvg } from "../lib/mermaidRender";
import { extractNodeId, replaceLabel } from "../lib/labelEdit";

interface Props {
  markup: string;
  onMarkupChange: (next: string) => void;
  onSvgReady: (svg: SVGSVGElement | null) => void;
}

interface EditState {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  nodeId: string | null;
  oldText: string;
}

export function DiagramCanvas({ markup, onMarkupChange, onSvgReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const svg = await renderToSvg(markup);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svg;
        setError(null);
        const svgEl = hostRef.current.querySelector("svg");
        onSvgReady(svgEl as SVGSVGElement | null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        onSvgReady(null);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [markup, onSvgReady]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!hostRef.current) return;
    const target = e.target as Element;
    const labelHost =
      target.closest(".nodeLabel, .edgeLabel, .label, foreignObject, text") ||
      null;
    if (!labelHost) return;

    const nodeAncestor = target.closest<SVGGElement>("g.node");
    const rect = (labelHost as Element).getBoundingClientRect();
    const hostRect = hostRef.current.getBoundingClientRect();
    const oldText = (labelHost.textContent ?? "").trim();
    if (!oldText) return;

    setEdit({
      x: rect.left - hostRect.left + hostRef.current.scrollLeft,
      y: rect.top - hostRect.top + hostRef.current.scrollTop,
      width: Math.max(rect.width, 60),
      height: Math.max(rect.height, 22),
      value: oldText,
      nodeId: extractNodeId(nodeAncestor?.id ?? null),
      oldText,
    });
  }

  function commitEdit() {
    if (!edit) return;
    const next = edit.value.trim();
    if (next && next !== edit.oldText) {
      const updated = replaceLabel(
        markup,
        { nodeId: edit.nodeId, oldText: edit.oldText },
        next,
      );
      onMarkupChange(updated);
    }
    setEdit(null);
  }

  return (
    <div className="canvas-pane">
      <div
        className="render-host"
        ref={hostRef}
        onClick={handleClick}
        style={{ position: "relative" }}
      >
        {edit && (
          <input
            className="inline-edit"
            autoFocus
            style={{
              left: edit.x,
              top: edit.y,
              width: edit.width,
              height: edit.height,
            }}
            value={edit.value}
            onChange={(e) => setEdit({ ...edit, value: e.target.value })}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              else if (e.key === "Escape") setEdit(null);
            }}
          />
        )}
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
