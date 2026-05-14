import { useEffect, useRef, useState } from "react";
import { renderToSvg } from "../lib/mermaidRender";
import { extractNodeId, replaceLabel } from "../lib/labelEdit";

interface Props {
  markup: string;
  onMarkupChange: (next: string) => void;
  onSvgReady: (svg: SVGSVGElement | null) => void;
  zoom: number;
  onZoomChange: (z: number, anchor?: { x: number; y: number }) => void;
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

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

export function DiagramCanvas({
  markup,
  onMarkupChange,
  onSvgReady,
  zoom,
  onZoomChange,
}: Props) {
  const paneRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const naturalRef = useRef<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  // Render markup → SVG.
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const svg = await renderToSvg(markup);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svg;
        setError(null);
        const svgEl = hostRef.current.querySelector("svg") as SVGSVGElement | null;
        if (svgEl) {
          // Capture natural pixel size from mermaid's emitted attrs/viewBox.
          const w =
            svgEl.viewBox.baseVal.width ||
            parseFloat(svgEl.getAttribute("width") ?? "0") ||
            svgEl.getBoundingClientRect().width;
          const h =
            svgEl.viewBox.baseVal.height ||
            parseFloat(svgEl.getAttribute("height") ?? "0") ||
            svgEl.getBoundingClientRect().height;
          naturalRef.current = { w, h };
          applyZoom(svgEl, zoom);
        }
        onSvgReady(svgEl);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup, onSvgReady]);

  // Re-apply zoom to current SVG when zoom changes.
  useEffect(() => {
    const svgEl = hostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (svgEl) applyZoom(svgEl, zoom);
  }, [zoom]);

  // Non-passive wheel handler for Ctrl/Cmd+wheel zoom (also covers trackpad pinch).
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    function onWheel(e: WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (!pane) return;
      const next = clampZoom(zoom * Math.exp(-e.deltaY / 200));
      if (next === zoom) return;
      const rect = pane.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const ratio = next / zoom;
      onZoomChange(next);
      requestAnimationFrame(() => {
        if (!pane) return;
        pane.scrollLeft = (pane.scrollLeft + px) * ratio - px;
        pane.scrollTop = (pane.scrollTop + py) * ratio - py;
      });
    }
    pane.addEventListener("wheel", onWheel, { passive: false });
    return () => pane.removeEventListener("wheel", onWheel);
  }, [zoom, onZoomChange]);

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
      x: rect.left - hostRect.left,
      y: rect.top - hostRect.top,
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

  function applyZoom(svgEl: SVGSVGElement, z: number) {
    const nat = naturalRef.current;
    if (!nat) return;
    svgEl.setAttribute("width", String(nat.w * z));
    svgEl.setAttribute("height", String(nat.h * z));
  }

  return (
    <div className="canvas-pane" ref={paneRef}>
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
      <button
        className="zoom-indicator"
        onClick={() => onZoomChange(1)}
        title="Reset zoom (⌘0)"
      >
        {Math.round(zoom * 100)}%
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
