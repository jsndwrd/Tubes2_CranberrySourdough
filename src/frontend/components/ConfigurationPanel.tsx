import type { Algorithm, ResultMode, SourceMode } from "../types";

type ConfigurationPanelProps = {
  algorithm: Algorithm;
  sourceMode: SourceMode;
  resultMode: ResultMode;
  isBusy: boolean;
  urlInput: string;
  htmlInput: string;
  selector: string;
  limitInput: string;
  onAlgorithmChange: (algorithm: Algorithm) => void;
  onSourceModeChange: (mode: SourceMode) => void;
  onResultModeChange: (mode: ResultMode) => void;
  onUrlInputChange: (value: string) => void;
  onHtmlInputChange: (value: string) => void;
  onSelectorChange: (value: string) => void;
  onLimitInputChange: (value: string) => void;
  onParseSource: (mode: SourceMode) => void;
  onRunTraversal: () => void;
  onReset: () => void;
};

export function ConfigurationPanel({ algorithm, sourceMode, resultMode, isBusy, urlInput, htmlInput, selector, limitInput, onAlgorithmChange, onSourceModeChange, onResultModeChange, onUrlInputChange, onHtmlInputChange, onSelectorChange, onLimitInputChange, onParseSource, onRunTraversal, onReset }: ConfigurationPanelProps) {
  return (
    <aside className="w-full border-b border-black/5 bg-[var(--surface-low)] p-4 xl:w-[19rem] xl:flex-shrink-0 xl:overflow-y-auto xl:border-b-0 xl:border-r">
      <div className="space-y-5">
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
            <span className="material-symbols-outlined text-[16px]">tune</span>
            Configuration
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3 border-b border-[var(--outline)]/40">
              <button
                className={[
                  "pb-2 text-sm font-medium",
                  sourceMode === "url"
                    ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                    : "text-[var(--text-muted)]"
                ].join(" ")}
                onClick={() => onSourceModeChange("url")}
                type="button"
              >
                URL Source
              </button>
              <button
                className={[
                  "pb-2 text-sm font-medium",
                  sourceMode === "html"
                    ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                    : "text-[var(--text-muted)]"
                ].join(" ")}
                onClick={() => onSourceModeChange("html")}
                type="button"
              >
                Raw HTML
              </button>
            </div>

            {sourceMode === "url" ? (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    DOM Input URL
                  </span>
                  <input
                    className="w-full rounded-xl border border-black/5 bg-[var(--surface-panel)] px-3.5 py-2.5 text-sm outline-none ring-0 transition focus:border-[var(--primary)]"
                    onChange={(event) => onUrlInputChange(event.target.value)}
                    placeholder="https://example.com"
                    type="text"
                    value={urlInput}
                  />
                </label>
                <button
                  className="w-full rounded-xl bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isBusy}
                  onClick={() => onParseSource("url")}
                  type="button"
                >
                  {isBusy ? "Loading..." : "Load Tree"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    DOM Input / Content
                  </span>
                  <textarea
                    className="h-36 w-full rounded-xl border border-black/5 bg-[var(--surface-panel)] px-3.5 py-3 font-code text-xs leading-relaxed outline-none transition focus:border-[var(--primary)]"
                    onChange={(event) => onHtmlInputChange(event.target.value)}
                    placeholder="<html>...</html>"
                    value={htmlInput}
                  />
                </label>
                <button
                  className="w-full rounded-xl bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isBusy}
                  onClick={() => onParseSource("html")}
                  type="button"
                >
                  {isBusy ? "Parsing..." : "Parse DOM"}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--text-muted)]">
              Algorithm Logic
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(["BFS", "DFS"] as const).map((item) => (
                <button
                  key={item}
                  className={[
                    "ambient-shadow rounded-xl border px-3.5 py-3 text-left transition",
                    algorithm === item
                      ? "border-transparent bg-[var(--surface-panel)] shadow-[0_16px_40px_-24px_rgba(25,28,29,0.24)]"
                      : "border-black/5 bg-white/60 opacity-70 hover:opacity-100"
                  ].join(" ")}
                  onClick={() => onAlgorithmChange(item)}
                  type="button"
                >
                  <span
                    className={[
                      "material-symbols-outlined mb-2 block text-[20px]",
                      item === "BFS"
                        ? "text-[var(--primary)]"
                        : "text-[var(--secondary)]"
                    ].join(" ")}
                  >
                    {item === "BFS" ? "dns" : "account_tree"}
                  </span>
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {item}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              CSS Selector
            </span>
            <input
              className="w-full rounded-xl border border-black/5 bg-[var(--surface-panel)] px-3.5 py-2.5 font-code text-sm outline-none transition focus:border-[var(--primary)]"
              onChange={(event) => onSelectorChange(event.target.value)}
              placeholder=".main-content > section"
              type="text"
              value={selector}
            />
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--text-muted)]">
                Limit Results (N)
              </label>
              <div className="flex rounded-xl bg-[var(--surface-strong)] p-1">
                <button
                  className={[
                    "rounded-lg px-3 py-1.5 text-xs font-medium",
                    resultMode === "top"
                      ? "bg-[var(--surface-panel)] text-[var(--text)] shadow-sm"
                      : "text-[var(--text-muted)]"
                  ].join(" ")}
                  onClick={() => onResultModeChange("top")}
                  type="button"
                >
                  Top N
                </button>
                <button
                  className={[
                    "rounded-lg px-3 py-1.5 text-xs font-medium",
                    resultMode === "all"
                      ? "bg-[var(--surface-panel)] text-[var(--text)] shadow-sm"
                      : "text-[var(--text-muted)]"
                  ].join(" ")}
                  onClick={() => onResultModeChange("all")}
                  type="button"
                >
                  All
                </button>
              </div>
            </div>
            <input
              className="w-full rounded-xl border border-black/5 bg-[var(--surface-panel)] px-3.5 py-2.5 text-sm outline-none"
              onChange={(event) => onLimitInputChange(event.target.value)}
              type="number"
              value={limitInput}
            />
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isBusy}
              onClick={onRunTraversal}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              {isBusy ? "Running..." : "Run Traversal"}
            </button>
            <button
              className="w-full rounded-xl bg-[var(--danger-soft)] px-4 py-2.5 text-sm font-medium text-[var(--danger)] transition hover:brightness-95"
              onClick={onReset}
              type="button"
            >
              Reset
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}