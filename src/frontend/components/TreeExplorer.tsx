import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { INSPECTOR_PANEL_WIDTH_PX } from "../constants";
import type { NodeStatus, VisualLayout, VisualLayoutNode } from "../types";
import { VIEWPORT_PADDING, WHEEL_ZOOM_INTENSITY, ZOOM_STEP, clampZoom, statusStyles } from "../logic/visualTree";

type TreeExplorerProps = {
  layout: VisualLayout | null;
  getStatus: (path: string) => NodeStatus;
  isInspectorVisible: boolean;
  onBackgroundClick: () => void;
  onSelect: (path: string) => void;
  statusText: string;
};

const INSPECTOR_SHIFT_DURATION_MS = 300;

function TreeNode({ label, status, compact = false }: { label: string; status: NodeStatus; compact?: boolean }) {
  return (
    <div
      className={[
        "flex items-center justify-center rounded-xl border text-xs font-semibold",
        compact
          ? "h-9 min-w-[4rem] px-3"
          : "h-11 min-w-[5rem] px-4",
        statusStyles[status].card
      ].join(" ")}
    >
      {label}
    </div>
  );
}

function TreeNodeCard({ node, status, onSelect }: { node: VisualLayoutNode; status: NodeStatus; onSelect: (path: string) => void }) {
  const tone = statusStyles[status];

  return (
    <button
      className={[
        "absolute flex flex-col justify-between rounded-2xl border px-3.5 py-3 text-left transition duration-200 backdrop-blur-sm outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        status === "inactive"
          ? "hover:-translate-y-0.5 hover:border-[var(--primary)]/25"
          : "hover:-translate-y-0.5",
        tone.card
      ].join(" ")}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height
      }}
      title={node.id}
      type="button"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text)]">
            {node.label}
          </p>
          <p className={["mt-1 truncate text-xs", tone.meta].join(" ")}>
            {node.meta}
          </p>
        </div>
        <span
          className={[
            "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
            tone.badge
          ].join(" ")}
        >
          {node.childCount}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span
          className={[
            "text-xs font-medium",
            tone.meta
          ].join(" ")}
        >
          Depth {node.depth}
        </span>
        <span
          className={[
            "text-xs font-medium",
            tone.meta
          ].join(" ")}
        >
          {node.childCount === 0
            ? "Leaf"
            : `${node.childCount} child${node.childCount === 1 ? "" : "ren"}`}
        </span>
      </div>
    </button>
  );
}

export function TreeExplorer({ layout, getStatus, isInspectorVisible, onBackgroundClick, onSelect, statusText }: TreeExplorerProps) {
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(1);
  const inspectorAnimationFrameRef = useRef<number | null>(null);
  const previousInspectorVisibleRef = useRef(isInspectorVisible);

  zoomRef.current = zoom;

  function cancelInspectorShiftAnimation() {
    if (inspectorAnimationFrameRef.current === null) {
      return;
    }

    cancelAnimationFrame(inspectorAnimationFrameRef.current);
    inspectorAnimationFrameRef.current = null;
  }

  function animateInspectorShift(delta: number) {
    const container = viewportRef.current;
    if (!container || delta === 0) {
      return;
    }

    cancelInspectorShiftAnimation();

    const startedAt = performance.now();
    const startScrollLeft = container.scrollLeft;

    const step = (now: number) => {
      const currentContainer = viewportRef.current;
      if (!currentContainer) {
        inspectorAnimationFrameRef.current = null;
        return;
      }

      const progress = Math.min(1, (now - startedAt) / INSPECTOR_SHIFT_DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      const maxScrollLeft = Math.max(currentContainer.scrollWidth - currentContainer.clientWidth, 0);
      const nextScrollLeft = Math.max(0, Math.min(startScrollLeft + delta * eased, maxScrollLeft));

      currentContainer.scrollLeft = nextScrollLeft;

      if (progress < 1) {
        inspectorAnimationFrameRef.current = requestAnimationFrame(step);
        return;
      }

      inspectorAnimationFrameRef.current = null;
    };

    inspectorAnimationFrameRef.current = requestAnimationFrame(step);
  }

  function centerViewport(nextZoom: number) {
    if (!layout || !viewportRef.current) {
      return;
    }

    const container = viewportRef.current;
    const scaledWidth = layout.width * nextZoom + VIEWPORT_PADDING * 2;
    container.scrollLeft = Math.max((scaledWidth - container.clientWidth) / 2, 0);
    container.scrollTop = 0;
  }

  function applyZoom(nextZoom: number, focus?: { x: number; y: number }) {
    if (!layout) return;
  
    const container = viewportRef.current;
    const clamped = clampZoom(nextZoom);
    if (clamped === zoomRef.current) return;
  
    if (!container) {
      zoomRef.current = clamped;
      setZoom(clamped);
      return;
    }

    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    const currentZoom = zoomRef.current;
  
    const focusX = focus?.x ?? container.clientWidth / 2;
    const focusY = focus?.y ?? container.clientHeight / 2;

    const contentX = (scrollLeft + focusX - VIEWPORT_PADDING) / currentZoom;
    const contentY = (scrollTop + focusY - VIEWPORT_PADDING) / currentZoom;

    const nextScrollLeft = contentX * clamped + VIEWPORT_PADDING - focusX;
    const nextScrollTop = contentY * clamped + VIEWPORT_PADDING - focusY;
  
    zoomRef.current = clamped;
  
    flushSync(() => {
      setZoom(clamped);
    });
  
    container.scrollLeft = Math.max(nextScrollLeft, 0);
    container.scrollTop = Math.max(nextScrollTop, 0);
  }

  function fitTree() {
    if (!layout || !viewportRef.current) {
      return;
    }

    const container = viewportRef.current;
    const widthRatio =
      (container.clientWidth - VIEWPORT_PADDING * 1.5) / Math.max(layout.width, 1);
    const heightRatio =
      (container.clientHeight - VIEWPORT_PADDING * 1.5) / Math.max(layout.height, 1);
    const fittedZoom = clampZoom(Math.min(widthRatio, heightRatio, 1));
    if (fittedZoom === zoomRef.current) {
      centerViewport(fittedZoom);
      return;
    }

    zoomRef.current = fittedZoom;
    flushSync(() => {
      setZoom(fittedZoom);
    });
    centerViewport(fittedZoom);
  }

  const scaledWidth = layout ? layout.width * zoom + VIEWPORT_PADDING * 2 : 0;
  const scaledHeight = layout ? layout.height * zoom + VIEWPORT_PADDING * 2 : 0;
  const controlButtonClass =
    "rounded-xl bg-white/90 px-3 py-2 text-xs font-medium text-[var(--text)] transition hover:bg-white";
  const linkElements = useMemo(() => {
    if (!layout) {
      return null;
    }

    return layout.links.map((link) => (
      <path
        key={link.id}
        className={statusStyles[getStatus(link.childId)].line}
        d={link.path}
        fill="none"
        strokeLinecap="round"
        strokeOpacity="0.55"
        strokeWidth="2.5"
      />
    ));
  }, [layout, getStatus]);
  const nodeElements = useMemo(() => {
    if (!layout) {
      return null;
    }

    return layout.nodes.map((entry) => (
      <TreeNodeCard
        key={entry.id}
        node={entry}
        onSelect={onSelect}
        status={getStatus(entry.id)}
      />
    ));
  }, [layout, getStatus, onSelect]);

  useEffect(() => {
    if (previousInspectorVisibleRef.current === isInspectorVisible) {
      return;
    }

    previousInspectorVisibleRef.current = isInspectorVisible;

    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      return;
    }

    animateInspectorShift(isInspectorVisible ? INSPECTOR_PANEL_WIDTH_PX : -INSPECTOR_PANEL_WIDTH_PX);
  }, [isInspectorVisible]);

  useEffect(() => {
    return () => {
      cancelInspectorShiftAnimation();
    };
  }, []);

  return (
    <div className="ambient-shadow relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--surface-panel)]">
      <div className="absolute inset-x-4 top-4 z-10 flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="glass-panel flex items-center gap-2.5 rounded-full px-3.5 py-2">
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
              <span className="material-symbols-outlined text-[16px]">account_tree</span>
              Tree
            </span>
            <span className="h-3 w-px bg-[var(--outline)]" />
            <span className="text-xs font-medium text-[var(--text)]">
              {layout ? `${layout.totalNodes} nodes` : "No DOM"}
            </span>
          </div>
          <div className="glass-panel flex items-center gap-2.5 rounded-full px-3.5 py-2">
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
              <span className="material-symbols-outlined text-[16px]">layers</span>
              Depth
            </span>
            <span className="h-3 w-px bg-[var(--outline)]" />
            <span className="text-xs font-medium text-[var(--text)]">
              Max: {layout ? layout.maxDepth : "-"}
            </span>
          </div>
          <div className="glass-panel rounded-full px-3.5 py-2 text-xs font-medium text-[var(--text-muted)]">
            Scroll to pan, use buttons or Ctrl/Cmd + wheel to zoom
          </div>
        </div>

        <div className="glass-panel flex items-center gap-1.5 rounded-2xl p-1.5">
          <button
            className={controlButtonClass}
            onClick={() => applyZoom(zoomRef.current - ZOOM_STEP)}
            type="button"
          >
            -
          </button>
          <button
            className={controlButtonClass}
            onClick={() => centerViewport(zoomRef.current)}
            type="button"
          >
            Center
          </button>
          <button
            className={controlButtonClass}
            onClick={fitTree}
            type="button"
          >
            Fit
          </button>
          <button
            className={controlButtonClass}
            onClick={() => applyZoom(1)}
            type="button"
          >
            100%
          </button>
          <button
            className="rounded-xl bg-[var(--primary-soft)] px-3 py-2 text-xs font-medium text-[var(--primary)] transition hover:brightness-95"
            onClick={() => applyZoom(zoomRef.current + ZOOM_STEP)}
            type="button"
          >
            +
          </button>
          <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs font-medium text-[var(--text-muted)]">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>

      <div
        className="tree-viewport-grid flex flex-1 overflow-auto px-4 pb-5 pt-24 md:pb-6"
        onClick={onBackgroundClick}
        onWheel={(event) => {
          if (!(event.ctrlKey || event.metaKey)) {
            return;
          }

          event.preventDefault();
          const deltaFactor =
            event.deltaMode === 1
              ? 16
              : event.deltaMode === 2
                ? event.currentTarget.clientHeight
                : 1;
          const normalizedDelta = Math.max(
            -120,
            Math.min(120, event.deltaY * deltaFactor)
          );
          const bounds = event.currentTarget.getBoundingClientRect();
          const nextZoom =
            zoomRef.current * Math.exp(-normalizedDelta * WHEEL_ZOOM_INTENSITY);

          applyZoom(nextZoom, {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top
          });
        }}
        ref={viewportRef}
      >
        {layout ? (
          <div className="min-h-full min-w-full">
            <div
              className="relative"
              style={{
                width: Math.max(scaledWidth, 1),
                height: Math.max(scaledHeight, 1)
              }}
            >
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{
                  transform: `translate(${VIEWPORT_PADDING}px, ${VIEWPORT_PADDING}px) scale(${zoom})`,
                  width: layout.width,
                  height: layout.height,
                  willChange: "transform"
                }}
              >
                <svg
                  className="pointer-events-none absolute inset-0 overflow-visible"
                  height={layout.height}
                  width={layout.width}
                >
                  {linkElements}
                </svg>

                {nodeElements}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <TreeNode label="HTML" status="inactive" />
              <p className="max-w-sm text-sm text-[var(--text-muted)]">
                Load a URL or paste raw HTML to generate the DOM preview.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-black/5 bg-[rgba(248,249,250,0.84)] px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[var(--primary)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Current
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#6b8f78]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Visited
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#2d8a5a]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Matched
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#cad2dd]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">
                Inactive
              </span>
            </div>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {statusText}
          </span>
        </div>
      </div>
    </div>
  );
}
