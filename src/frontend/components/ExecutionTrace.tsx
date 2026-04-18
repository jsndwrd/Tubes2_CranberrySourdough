import { useEffect, useRef, useState } from "react";
import type { RunSummary, TraceEntry } from "../types";

type ExecutionTraceProps = {
  isOpen: boolean;
  traceEntries: TraceEntry[];
  summary: RunSummary;
  onToggle: () => void;
  onClear: () => void;
};

const COLLAPSED_TRACE_HEIGHT_PX = 60;
const DEFAULT_MOBILE_TRACE_HEIGHT_PX = 320;
const DEFAULT_DESKTOP_TRACE_HEIGHT_PX = 256;
const MAX_TRACE_HEIGHT_RATIO = 0.6;
const COLLAPSE_SNAP_THRESHOLD_PX = 12;

type ResizeState = {
  pointerId: number;
  startHeight: number;
  startY: number;
};

function getDefaultTraceHeight() {
  if (typeof window !== "undefined" && window.innerWidth >= 1280) {
    return DEFAULT_DESKTOP_TRACE_HEIGHT_PX;
  }

  return DEFAULT_MOBILE_TRACE_HEIGHT_PX;
}

function getMaxTraceHeight() {
  if (typeof window === "undefined") {
    return DEFAULT_MOBILE_TRACE_HEIGHT_PX;
  }

  return Math.max(
    COLLAPSED_TRACE_HEIGHT_PX,
    Math.round(window.innerHeight * MAX_TRACE_HEIGHT_RATIO)
  );
}

function clampTraceHeight(height: number) {
  return Math.min(getMaxTraceHeight(), Math.max(COLLAPSED_TRACE_HEIGHT_PX, Math.round(height)));
}

export function ExecutionTrace({ isOpen, traceEntries, summary, onToggle, onClear }: ExecutionTraceProps) {
  const [openHeight, setOpenHeight] = useState(getDefaultTraceHeight);
  const [isResizing, setIsResizing] = useState(false);
  const openHeightRef = useRef(getDefaultTraceHeight());
  const lastExpandedHeightRef = useRef(openHeight);
  const resizeStateRef = useRef<ResizeState | null>(null);

  function resetDocumentResizeState() {
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }

  function finishResize() {
    const resizeState = resizeStateRef.current;
    if (!resizeState) {
      return;
    }

    resizeStateRef.current = null;
    setIsResizing(false);
    resetDocumentResizeState();

    const finalHeight = clampTraceHeight(openHeightRef.current);
    if (finalHeight <= COLLAPSED_TRACE_HEIGHT_PX + COLLAPSE_SNAP_THRESHOLD_PX) {
      setOpenHeight(lastExpandedHeightRef.current);
      if (isOpen) {
        onToggle();
      }
      return;
    }

    lastExpandedHeightRef.current = finalHeight;
    setOpenHeight(finalHeight);
  }

  useEffect(() => {
    openHeightRef.current = openHeight;
  }, [openHeight]);

  useEffect(() => {
    if (openHeight > COLLAPSED_TRACE_HEIGHT_PX + COLLAPSE_SNAP_THRESHOLD_PX) {
      lastExpandedHeightRef.current = openHeight;
    }
  }, [openHeight]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncHeight = () => {
      setOpenHeight((current) => clampTraceHeight(current));
      lastExpandedHeightRef.current = clampTraceHeight(lastExpandedHeightRef.current);
    };

    window.addEventListener("resize", syncHeight);

    return () => {
      window.removeEventListener("resize", syncHeight);
    };
  }, []);

  useEffect(() => {
    return () => {
      resetDocumentResizeState();
    };
  }, []);

  const currentHeight = isOpen ? clampTraceHeight(openHeight) : COLLAPSED_TRACE_HEIGHT_PX;

  return (
    <footer
      className={[
        "relative flex shrink-0 flex-col overflow-hidden bg-[#0f1726] text-slate-300",
        isResizing ? "" : "transition-[height] duration-300"
      ].join(" ")}
      style={{ height: currentHeight }}
    >
      {isOpen ? (
        <div
          className="absolute inset-x-0 top-0 z-10 h-3 cursor-row-resize touch-none"
          onPointerCancel={finishResize}
          onPointerDown={(event) => {
            resizeStateRef.current = {
              pointerId: event.pointerId,
              startHeight: openHeightRef.current,
              startY: event.clientY
            };
            setIsResizing(true);
            document.body.style.cursor = "ns-resize";
            document.body.style.userSelect = "none";
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const resizeState = resizeStateRef.current;
            if (!resizeState || resizeState.pointerId !== event.pointerId) {
              return;
            }

            setOpenHeight(
              clampTraceHeight(resizeState.startHeight + (resizeState.startY - event.clientY))
            );
          }}
          onPointerUp={(event) => {
            if (resizeStateRef.current?.pointerId !== event.pointerId) {
              return;
            }

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }

            finishResize();
          }}
        >
          <div className="pointer-events-none mx-auto mt-1 h-1 w-14 rounded-full bg-white/14" />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 bg-[#182236] px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <button
            aria-expanded={isOpen}
            className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium text-white transition hover:bg-white/5"
            onClick={onToggle}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-blue-400">
              terminal
            </span>
            Execution Trace
            <span className="material-symbols-outlined text-[16px] text-slate-400">
              {isOpen ? "keyboard_arrow_down" : "keyboard_arrow_up"}
            </span>
          </button>
          {isOpen ? (
            <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
              <button
                className="transition hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={traceEntries.length === 0}
                onClick={onClear}
                type="button"
              >
                Clear
              </button>
              <button className="opacity-70" disabled type="button">
                Export CSV
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="text-blue-400">Info: {summary.info}</span>
          <span className="text-emerald-400">Match: {summary.match}</span>
          <span className="text-rose-400">Error: {summary.error}</span>
        </div>
      </div>

      {isOpen ? (
        traceEntries.length > 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 font-code text-xs leading-relaxed">
            <div className="space-y-2">
              {traceEntries.map((entry, index) => {
                const levelClass =
                  entry.level === "MATCH"
                    ? "text-emerald-400"
                    : entry.level === "ERROR"
                      ? "text-rose-400"
                      : "text-blue-400";

                return (
                  <div
                    key={`${entry.time}-${entry.text}-${index}`}
                    className="flex gap-4"
                    style={entry.indent ? { marginLeft: entry.indent * 16 } : undefined}
                  >
                    <span className="w-16 shrink-0 text-slate-500">{entry.time}</span>
                    <span className={["shrink-0 font-bold", levelClass].join(" ")}>
                      [{entry.level}]
                    </span>
                    <span className="text-slate-200">{entry.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4 text-sm leading-relaxed">
            <div className="space-y-2 text-center">
              <p className="font-headline text-lg font-semibold text-white">Trace is empty</p>
              <p className="max-w-md text-slate-400">
                Parse a document or run traversal to populate the execution log.
              </p>
            </div>
          </div>
        )
      ) : null}
    </footer>
  );
}
