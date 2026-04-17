import type { Algorithm, ResultMode, SourceMode } from "../types";

type ConfigurationPanelProps = {
  algorithm: Algorithm;
  collapsed: boolean;
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

export function ConfigurationPanel({ algorithm, collapsed, sourceMode, resultMode, isBusy, urlInput, htmlInput, selector, limitInput, onAlgorithmChange, onSourceModeChange, onResultModeChange, onUrlInputChange, onHtmlInputChange, onSelectorChange, onLimitInputChange, onParseSource, onRunTraversal, onReset }: ConfigurationPanelProps) {
  const tabButtonClass = "pb-2 text-sm font-medium transition-colors hover:text-[var(--primary)]";
  const primaryActionButtonClass = "flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-22px_rgba(0,69,163,0.8)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70";
  const tertiaryActionButtonClass = "w-full rounded-xl border border-[var(--primary)]/16 bg-white px-4 py-2.5 text-sm font-medium text-[var(--primary)] transition hover:-translate-y-0.5 hover:border-[var(--primary)]/26 hover:bg-[var(--primary-soft)]/38 hover:shadow-[0_14px_24px_-20px_rgba(0,69,163,0.52)] disabled:cursor-not-allowed disabled:opacity-70";
  const segmentedContainerClass = "flex rounded-xl border border-black/5 bg-white p-1";
  const segmentedButtonBaseClass = "rounded-lg border px-3 py-1.5 text-xs font-medium transition";
  const algorithmCardBaseClass = "ambient-shadow rounded-xl border px-3.5 py-3 text-left transition";
  const selectedHighlightClass = "border-[var(--primary)]/30 bg-[linear-gradient(180deg,rgba(217,226,255,0.92)_0%,rgba(255,255,255,0.98)_100%)] text-[var(--primary)] shadow-[0_18px_30px_-22px_rgba(0,69,163,0.72)] ring-1 ring-[var(--primary)]/14";

  return (
    <div
      className={[
        "relative w-full xl:min-w-0 xl:overflow-visible"
      ].join(" ")}
    >
      <aside
        aria-hidden={collapsed}
        className={[
          "w-full border-b border-black/5 bg-[var(--surface-low)] p-4 transition-[transform,opacity] duration-300 ease-out xl:absolute xl:inset-y-0 xl:left-0 xl:w-[19rem] xl:overflow-y-auto xl:border-b-0 xl:border-r",
          collapsed ? "pointer-events-none xl:-translate-x-full xl:opacity-0" : "xl:translate-x-0 xl:opacity-100"
        ].join(" ")}
      >
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
                    tabButtonClass,
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
                    tabButtonClass,
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
                    className={tertiaryActionButtonClass}
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
                    className={tertiaryActionButtonClass}
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
                      algorithmCardBaseClass,
                      algorithm === item
                        ? "border-[var(--primary)]/30 bg-[linear-gradient(180deg,rgba(217,226,255,0.92)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_18px_30px_-22px_rgba(0,69,163,0.72)] ring-1 ring-[var(--primary)]/14"
                        : "border-black/5 bg-white/78 hover:border-[var(--primary)]/18 hover:bg-[var(--primary-soft)]/32 hover:shadow-[0_14px_24px_-20px_rgba(0,69,163,0.4)]"
                    ].join(" ")}
                    onClick={() => onAlgorithmChange(item)}
                    type="button"
                  >
                    <span
                      className={[
                        "material-symbols-outlined mb-2 block text-[20px]",
                        algorithm === item
                          ? "text-[var(--primary)]"
                          : "text-[var(--primary)]/72"
                      ].join(" ")}
                    >
                      {item === "BFS" ? "dns" : "account_tree"}
                    </span>
                    <p className={[
                      "text-sm font-semibold",
                      algorithm === item ? "text-[var(--primary)]" : "text-[var(--text)]"
                    ].join(" ")}>
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
                <div className={segmentedContainerClass}>
                  <button
                    className={[
                      segmentedButtonBaseClass,
                      resultMode === "top"
                        ? selectedHighlightClass
                        : "border-transparent text-[var(--text-muted)] hover:border-[var(--primary)]/12 hover:bg-[var(--primary-soft)]/38 hover:text-[var(--primary)]"
                    ].join(" ")}
                    onClick={() => onResultModeChange("top")}
                    type="button"
                  >
                    Top N
                  </button>
                  <button
                    className={[
                      segmentedButtonBaseClass,
                      resultMode === "all"
                        ? selectedHighlightClass
                        : "border-transparent text-[var(--text-muted)] hover:border-[var(--primary)]/12 hover:bg-[var(--primary-soft)]/38 hover:text-[var(--primary)]"
                    ].join(" ")}
                    onClick={() => onResultModeChange("all")}
                    type="button"
                  >
                    All
                  </button>
                </div>
              </div>
              {resultMode === "top" ? (
                <input
                  className="w-full rounded-xl border border-black/5 bg-[var(--surface-panel)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--primary)]"
                  onChange={(event) => onLimitInputChange(event.target.value)}
                  type="number"
                  value={limitInput}
                />
              ) : null}
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                className={primaryActionButtonClass}
                disabled={isBusy}
                onClick={onRunTraversal}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                {isBusy ? "Running..." : "Run Traversal"}
              </button>
              <button
                className={tertiaryActionButtonClass}
                onClick={onReset}
                type="button"
              >
                Reset
              </button>
            </div>
          </section>
        </div>
      </aside>

    </div>
  );
}
