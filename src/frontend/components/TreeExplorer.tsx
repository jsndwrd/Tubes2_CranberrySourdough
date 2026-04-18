import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { INSPECTOR_PANEL_WIDTH_PX } from "../constants";
import type { NodeStatus, VisualLayout, VisualLayoutNode } from "../types";
import { VIEWPORT_PADDING, WHEEL_ZOOM_INTENSITY, ZOOM_STEP, clampZoom, statusStyles } from "../logic/visualTree";

type TreeExplorerProps = {
  activeTraversalPath: string | null;
  autoFitSignal: number;
  flashingMatchedPathSet: Set<string>;
  layout: VisualLayout | null;
  getStatus: (path: string) => NodeStatus;
  isInspectorVisible: boolean;
  onBackgroundClick: () => void;
  onSelect: (path: string) => void;
  statusText: string;
};

const INSPECTOR_SHIFT_DURATION_MS = 300;
const ZOOM_RESET_THRESHOLD = 0.001;
const SCROLL_RESET_THRESHOLD = 1;
const DRAG_PAN_THRESHOLD_PX = 4;

type ViewportSnapshot = {
  zoom: number;
  scrollLeft: number;
  scrollTop: number;
};

type PanState = {
  didDrag: boolean;
  pointerId: number;
  startScrollLeft: number;
  startScrollTop: number;
  startX: number;
  startY: number;
};

type WebkitGestureEvent = Event & {
  clientX: number;
  clientY: number;
  scale: number;
};

function TreeNode({ label, status }: { label: string; status: NodeStatus }) {
  return (
    <div
      className={[
        "flex items-center justify-center rounded-xl border text-xs font-semibold",
        "h-11 min-w-[5rem] px-4",
        statusStyles[status].card
      ].join(" ")}
    >
      {label}
    </div>
  );
}

function TreeNodeCard({
  isMatchFlashing,
  isTraversalActive,
  node,
  onSelect,
  status
}: {
  isMatchFlashing: boolean;
  isTraversalActive: boolean;
  node: VisualLayoutNode;
  status: NodeStatus;
  onSelect: (path: string) => void;
}) {
  const tone = statusStyles[status];

  return (
    <button
      className={[
        "absolute flex flex-col justify-between rounded-2xl border px-3.5 py-3 text-left transition duration-200 backdrop-blur-sm outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        status === "inactive"
          ? "hover:-translate-y-0.5 hover:border-[var(--primary)]/25"
          : "hover:-translate-y-0.5",
        isTraversalActive
          ? "ring-2 ring-[var(--primary)]/16 ring-offset-2 ring-offset-white"
          : "",
        isMatchFlashing
          ? "ring-2 ring-[#2d8a5a]/28 ring-offset-2 ring-offset-white animate-[pulse_0.45s_ease-out_1]"
          : "",
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

export function TreeExplorer({ activeTraversalPath, autoFitSignal, flashingMatchedPathSet, layout, getStatus, isInspectorVisible, onBackgroundClick, onSelect, statusText }: TreeExplorerProps) {
  const [canResetView, setCanResetView] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const defaultViewportRef = useRef<ViewportSnapshot | null>(null);
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(1);
  const applyZoomRef = useRef<(nextZoom: number, focus?: { x: number; y: number }) => void>(() => undefined);
  const animateInspectorShiftRef = useRef<(delta: number) => void>(() => undefined);
  const fitTreeRef = useRef<(storeAsDefault?: boolean) => void>(() => undefined);
  const inspectorAnimationFrameRef = useRef<number | null>(null);
  const previousInspectorVisibleRef = useRef(isInspectorVisible);
  const panStateRef = useRef<PanState | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number | null>(null);
  const gestureStartZoomRef = useRef<number | null>(null);
  const gestureActiveRef = useRef(false);

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

  animateInspectorShiftRef.current = animateInspectorShift;

  function centerViewport(nextZoom: number) {
    if (!layout || !viewportRef.current) {
      return;
    }

    const container = viewportRef.current;
    const scaledWidth = layout.width * nextZoom + VIEWPORT_PADDING * 2;
    container.scrollLeft = Math.max((scaledWidth - container.clientWidth) / 2, 0);
    container.scrollTop = 0;
  }

  function captureDefaultViewport(nextZoom = zoomRef.current) {
    const container = viewportRef.current;
    defaultViewportRef.current = {
      zoom: nextZoom,
      scrollLeft: container?.scrollLeft ?? 0,
      scrollTop: container?.scrollTop ?? 0
    };
    setCanResetView(false);
  }

  function syncResetAvailability(
    nextZoom = zoomRef.current,
    scrollLeft = viewportRef.current?.scrollLeft ?? 0,
    scrollTop = viewportRef.current?.scrollTop ?? 0
  ) {
    const snapshot = defaultViewportRef.current;
    setCanResetView(
      snapshot
        ? Math.abs(nextZoom - snapshot.zoom) > ZOOM_RESET_THRESHOLD ||
            Math.abs(scrollLeft - snapshot.scrollLeft) > SCROLL_RESET_THRESHOLD ||
            Math.abs(scrollTop - snapshot.scrollTop) > SCROLL_RESET_THRESHOLD
        : false
    );
  }

  function restoreDefaultViewport() {
    const snapshot = defaultViewportRef.current;
    const container = viewportRef.current;
    if (!snapshot || !container) {
      return;
    }

    zoomRef.current = snapshot.zoom;
    flushSync(() => {
      setZoom(snapshot.zoom);
    });
    container.scrollLeft = snapshot.scrollLeft;
    container.scrollTop = snapshot.scrollTop;
    setCanResetView(false);
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

    const focusX = focus?.x ?? container.clientWidth / 2;
    const focusY = focus?.y ?? container.clientHeight / 2;

    const contentX = (container.scrollLeft + focusX - VIEWPORT_PADDING) / zoomRef.current;
    const contentY = (container.scrollTop + focusY - VIEWPORT_PADDING) / zoomRef.current;

    const nextScrollLeft = contentX * clamped + VIEWPORT_PADDING - focusX;
    const nextScrollTop = contentY * clamped + VIEWPORT_PADDING - focusY;

    zoomRef.current = clamped;

    flushSync(() => {
      setZoom(clamped);
    });

    const resolvedScrollLeft = Math.max(nextScrollLeft, 0);
    const resolvedScrollTop = Math.max(nextScrollTop, 0);

    container.scrollLeft = resolvedScrollLeft;
    container.scrollTop = resolvedScrollTop;
    syncResetAvailability(clamped, resolvedScrollLeft, resolvedScrollTop);
  }

  applyZoomRef.current = applyZoom;

  function clearSuppressedClick() {
    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current);
      suppressClickTimeoutRef.current = null;
    }

    suppressClickRef.current = false;
  }

  function suppressNextClick() {
    clearSuppressedClick();
    suppressClickRef.current = true;
    suppressClickTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimeoutRef.current = null;
    }, 0);
  }

  function finishPanning() {
    const panState = panStateRef.current;
    if (!panState) {
      return;
    }

    panStateRef.current = null;
    setIsPanning(false);

    if (panState.didDrag) {
      suppressNextClick();
    }
  }

  function fitTree(storeAsDefault = false) {
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
      if (storeAsDefault) {
        captureDefaultViewport(fittedZoom);
        return;
      }

      syncResetAvailability(fittedZoom);
      return;
    }

    zoomRef.current = fittedZoom;
    flushSync(() => {
      setZoom(fittedZoom);
    });
    centerViewport(fittedZoom);
    if (storeAsDefault) {
      captureDefaultViewport(fittedZoom);
      return;
    }

    syncResetAvailability(fittedZoom);
  }

  fitTreeRef.current = fitTree;

  const scaledWidth = layout ? layout.width * zoom + VIEWPORT_PADDING * 2 : 0;
  const scaledHeight = layout ? layout.height * zoom + VIEWPORT_PADDING * 2 : 0;
  const zoomControlButtonClass =
    "flex h-10 w-10 items-center justify-center rounded-[1rem] bg-transparent text-[2rem] font-semibold leading-none text-[var(--text)] transition hover:bg-white hover:text-[var(--primary)] hover:shadow-[0_12px_20px_-18px_rgba(0,69,163,0.65)]";
  const resetControlButtonClass =
    "glass-panel ambient-shadow flex h-10 w-10 items-center justify-center rounded-[1rem] text-[var(--text-muted)] transition hover:-translate-y-0.5 hover:bg-white hover:text-[var(--primary)] hover:shadow-[0_14px_24px_-20px_rgba(0,69,163,0.52)]";
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
        isMatchFlashing={flashingMatchedPathSet.has(entry.id)}
        isTraversalActive={activeTraversalPath === entry.id}
        key={entry.id}
        node={entry}
        onSelect={onSelect}
        status={getStatus(entry.id)}
      />
    ));
  }, [activeTraversalPath, flashingMatchedPathSet, layout, getStatus, onSelect]);

  useEffect(() => {
    if (previousInspectorVisibleRef.current === isInspectorVisible) {
      return;
    }

    previousInspectorVisibleRef.current = isInspectorVisible;

    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      return;
    }

    animateInspectorShiftRef.current(isInspectorVisible ? INSPECTOR_PANEL_WIDTH_PX : -INSPECTOR_PANEL_WIDTH_PX);
  }, [isInspectorVisible]);

  useEffect(() => {
    return () => {
      cancelInspectorShiftAnimation();
      clearSuppressedClick();
    };
  }, []);

  useEffect(() => {
    const container = viewportRef.current;
    if (!container || !layout || typeof window === "undefined") {
      return;
    }

    const handleGestureStart = (event: Event) => {
      const gestureEvent = event as WebkitGestureEvent;
      gestureActiveRef.current = true;
      gestureStartZoomRef.current = zoomRef.current;
      gestureEvent.preventDefault();
    };

    const handleGestureChange = (event: Event) => {
      if (gestureStartZoomRef.current === null) {
        return;
      }

      const gestureEvent = event as WebkitGestureEvent;
      const bounds = container.getBoundingClientRect();
      gestureEvent.preventDefault();
      applyZoomRef.current(gestureStartZoomRef.current * gestureEvent.scale, {
        x: gestureEvent.clientX - bounds.left,
        y: gestureEvent.clientY - bounds.top
      });
    };

    const handleGestureEnd = () => {
      gestureActiveRef.current = false;
      gestureStartZoomRef.current = null;
    };

    container.addEventListener("gesturestart", handleGestureStart, { passive: false });
    container.addEventListener("gesturechange", handleGestureChange, { passive: false });
    container.addEventListener("gestureend", handleGestureEnd);

    return () => {
      container.removeEventListener("gesturestart", handleGestureStart);
      container.removeEventListener("gesturechange", handleGestureChange);
      container.removeEventListener("gestureend", handleGestureEnd);
    };
  }, [layout]);

  useEffect(() => {
    if (!layout) {
      defaultViewportRef.current = null;
      setCanResetView(false);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      captureDefaultViewport();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [layout]);

  useEffect(() => {
    if (autoFitSignal === 0 || !layout) {
      return;
    }

    fitTreeRef.current(true);
  }, [autoFitSignal, layout]);

  return (
    <div className="ambient-shadow relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--surface-panel)]">
      <div className="absolute left-4 right-[4.5rem] top-4 z-10 flex flex-col gap-2.5">
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
        </div>
      </div>

      <div className="absolute right-4 top-4 z-10 flex flex-col items-center gap-2">
        <div className="glass-panel ambient-shadow flex flex-col overflow-hidden rounded-[1.25rem] p-1">
          <button
            aria-label="Zoom in"
            className={zoomControlButtonClass}
            onClick={() => applyZoom(zoomRef.current + ZOOM_STEP)}
            type="button"
          >
            +
          </button>
          <div className="mx-1 h-px bg-[var(--outline)]/70" />
          <button
            aria-label="Zoom out"
            className={zoomControlButtonClass}
            onClick={() => applyZoom(zoomRef.current - ZOOM_STEP)}
            type="button"
          >
            -
          </button>
        </div>

        {canResetView ? (
          <button
            aria-label="Reset view"
            className={resetControlButtonClass}
            onClick={restoreDefaultViewport}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
          </button>
        ) : null}
      </div>

      <div
        className={[
          "tree-viewport-grid flex flex-1 overflow-auto px-4 pb-5 pt-24 md:pb-6",
          layout ? (isPanning ? "cursor-grabbing select-none" : "cursor-grab") : ""
        ].join(" ")}
        onClick={onBackgroundClick}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) {
            return;
          }

          clearSuppressedClick();
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerCancel={(event) => {
          if (panStateRef.current?.pointerId !== event.pointerId) {
            return;
          }

          finishPanning();
        }}
        onPointerDown={(event) => {
          if (!layout || event.button !== 0) {
            return;
          }

          clearSuppressedClick();
          panStateRef.current = {
            didDrag: false,
            pointerId: event.pointerId,
            startScrollLeft: event.currentTarget.scrollLeft,
            startScrollTop: event.currentTarget.scrollTop,
            startX: event.clientX,
            startY: event.clientY
          };
        }}
        onPointerMove={(event) => {
          const panState = panStateRef.current;
          if (!panState || panState.pointerId !== event.pointerId) {
            return;
          }

          const deltaX = event.clientX - panState.startX;
          const deltaY = event.clientY - panState.startY;

          if (!panState.didDrag && Math.hypot(deltaX, deltaY) < DRAG_PAN_THRESHOLD_PX) {
            return;
          }

          if (!panState.didDrag) {
            panState.didDrag = true;
            setIsPanning(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }

          event.preventDefault();
          event.currentTarget.scrollLeft = panState.startScrollLeft - deltaX;
          event.currentTarget.scrollTop = panState.startScrollTop - deltaY;
          syncResetAvailability(
            zoomRef.current,
            event.currentTarget.scrollLeft,
            event.currentTarget.scrollTop
          );
        }}
        onPointerUp={(event) => {
          if (panStateRef.current?.pointerId !== event.pointerId) {
            return;
          }

          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }

          finishPanning();
        }}
        onLostPointerCapture={(event) => {
          if (panStateRef.current?.pointerId !== event.pointerId) {
            return;
          }

          finishPanning();
        }}
        onWheel={(event) => {
          if (!layout || gestureActiveRef.current) {
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
