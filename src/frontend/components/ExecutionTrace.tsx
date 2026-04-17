import type { RunSummary, TraceEntry } from "../types";

type ExecutionTraceProps = {
  isOpen: boolean;
  traceEntries: TraceEntry[];
  summary: RunSummary;
  onToggle: () => void;
  onClear: () => void;
};

export function ExecutionTrace({ isOpen, traceEntries, summary, onToggle, onClear }: ExecutionTraceProps) {
  return (
    <footer
      className={[
        "flex flex-col bg-[#0f1726] text-slate-300 transition-[height] duration-300",
        isOpen ? "h-[20rem] xl:h-64" : "h-[3.75rem]"
      ].join(" ")}
    >
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
          <div className="flex-1 overflow-y-auto px-4 py-4 font-code text-xs leading-relaxed">
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
          <div className="flex flex-1 items-center justify-center px-4 py-4 text-sm leading-relaxed">
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