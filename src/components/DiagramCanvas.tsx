import { useEffect, useRef, useState } from "react";
import { renderToSvg } from "../lib/mermaidRender";
import { extractNodeId, removeElement, replaceLabel } from "../lib/labelEdit";

interface Props {
  markup: string;
  onMarkupChange: (next: string) => void;
  onSvgReady: (svg: SVGSVGElement | null) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
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

  // Ctrl/Cmd + wheel zoom (also covers trackpad pinch which fires with ctrlKey).
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    function onWheel(e: WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const next = clampZoom(zoom * Math.exp(-e.deltaY / 200));
      if (next !== zoom) onZoomChange(next);
    }
    pane.addEventListener("wheel", onWheel, { passive: false });
    return () => pane.removeEventListener("wheel", onWheel);
  }, [zoom, onZoomChange]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!hostRef.current) return;
    const target = e.target as Element;

    let labelHost: Element | null = target.closest(
      ".nodeLabel, .edgeLabel, .label, foreignObject, text",
    );

    // Fallback: clicked on a node's rect/path — find its label inside.
    if (!labelHost) {
      const nodeContainer = target.closest("g.node, g.actor, g.cluster");
      if (nodeContainer) {
        labelHost =
          nodeContainer.querySelector(".nodeLabel") ||
          nodeContainer.querySelector(".label") ||
          nodeContainer.querySelector("foreignObject") ||
          nodeContainer.querySelector("text");
      }
    }

    if (!labelHost) return;

    const nodeAncestor = labelHost.closest<SVGGElement>("g.node");
    const rect = labelHost.getBoundingClientRect();
    const hostRect = hostRef.current.getBoundingClientRect();
    const oldText = (labelHost.textContent ?? "").trim();
    if (!oldText) return;

    // Render-host has transform: scale(zoom); transform-origin: 0 0.
    // getBoundingClientRect on children returns post-transform client coords.
    // Convert to host-local pre-transform coords (where absolute children sit)
    // by dividing by zoom.
    setEdit({
      x: (rect.left - hostRect.left) / zoom,
      y: (rect.top - hostRect.top) / zoom,
      width: Math.max(rect.width / zoom, 60),
      height: Math.max(rect.height / zoom, 22),
      value: oldText,
      nodeId: extractNodeId(nodeAncestor?.id ?? null),
      oldText,
    });
  }

  function commitEdit() {
    if (!edit) return;
    const next = edit.value.trim();
    if (next === "") {
      onMarkupChange(removeElement(markup, edit.oldText));
    } else if (next !== edit.oldText) {
      onMarkupChange(
        replaceLabel(
          markup,
          { nodeId: edit.nodeId, oldText: edit.oldText },
          next,
        ),
      );
    }
    setEdit(null);
  }

  return (
    <div className="canvas-pane" ref={paneRef}>
      <div
        className="render-host"
        ref={hostRef}
        onClick={handleClick}
        style={{
          position: "relative",
          transform: `scale(${zoom})`,
          transformOrigin: "0 0",
        }}
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
