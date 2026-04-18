import type { CSSProperties } from "react";
import { INSPECTOR_PANEL_WIDTH } from "../constants";
import type { Algorithm, NodeDetails, ResultItem, RunSummary } from "../types";

type InspectorSidebarProps = {
  selectedDetails: NodeDetails | null;
  visibleResults: ResultItem[];
  selectedPath: string | null;
  summary: RunSummary;
  algorithm: Algorithm;
  visible: boolean;
  onSelectPath: (path: string) => void;
};

export function InspectorSidebar({ selectedDetails, visibleResults, selectedPath, summary, algorithm, visible, onSelectPath }: InspectorSidebarProps) {
  return (
    <div
      className={[
        "relative w-full overflow-hidden transition-[max-height] duration-300 ease-out xl:min-w-0 xl:overflow-visible",
        visible ? "max-h-[80rem] xl:max-h-none" : "max-h-0 xl:max-h-none"
      ].join(" ")}
      style={{ "--inspector-panel-width": INSPECTOR_PANEL_WIDTH } as CSSProperties}
    >
      <aside
        aria-hidden={!visible}
        className={[
          "w-full border-t border-black/5 bg-[var(--surface)] transition-[transform,opacity] duration-300 ease-out xl:absolute xl:inset-y-0 xl:right-0 xl:w-[var(--inspector-panel-width)] xl:overflow-y-auto xl:border-l xl:border-t-0",
          visible ? "translate-y-0 opacity-100 xl:translate-x-0" : "pointer-events-none -translate-y-3 opacity-0 xl:translate-x-full"
        ].join(" ")}
      >
        <section className="border-b border-black/5 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
            <span className="material-symbols-outlined text-[16px]">info</span>
            Node Inspector
          </h3>
          <div className="space-y-4 rounded-2xl bg-[var(--surface-low)] p-4">
            <div className="space-y-1.5">
              <p className="font-headline text-xl font-semibold text-[var(--primary)]">
                {selectedDetails?.tag ?? "No node selected"}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {selectedDetails ? "Tree node is active" : "Select a node from the tree or results"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Classes
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {selectedDetails?.classes ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Depth
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {selectedDetails?.depth ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Parent
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {selectedDetails?.parent ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Children
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {selectedDetails?.children ?? "-"}
                </p>
              </div>
            </div>

            <div className="border-t border-black/5 pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  DOM Path
                </p>
                {selectedDetails ? (
                  <span className="rounded-full bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)]">
                    {selectedDetails.badge}
                  </span>
                ) : null}
              </div>
              <p className="rounded-xl bg-white/70 p-3 font-code text-xs leading-relaxed text-[var(--text-muted)]">
                {selectedDetails?.path ?? "No path available"}
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col p-4 xl:min-h-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
              <span className="material-symbols-outlined text-[16px]">checklist</span>
              Matched Results
            </h3>
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
              {summary.match} Found
            </span>
          </div>

          {visibleResults.length > 0 ? (
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {visibleResults.map((result) => {
                const active = result.path === selectedPath;

                return (
                  <button
                    key={result.id}
                    className={[
                      "block w-full rounded-r-xl border-l-4 p-3.5 text-left transition",
                      active
                        ? "border-[var(--tertiary)] bg-[var(--surface-panel)]"
                        : "border-transparent bg-[var(--surface-low)] hover:bg-white"
                    ].join(" ")}
                    onClick={() => onSelectPath(result.path)}
                    type="button"
                  >
                    <div className="mb-1 flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-[var(--text)]">
                        {result.shortLabel}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        Order: {result.order}
                      </span>
                    </div>
                    <p className="truncate font-code text-xs text-[var(--text-muted)]">
                      {result.path}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl bg-[var(--surface-low)] p-5 text-center">
              <div className="max-w-56 space-y-2">
                <p className="font-headline text-lg font-semibold text-[var(--text)]">
                  No matched results
                </p>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                  Run traversal with a supported selector to populate this panel.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3 bg-[var(--surface-low)] p-4">
          <div className="rounded-xl bg-[var(--surface-panel)] p-3.5">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Execution
            </p>
            <p className="mt-1 font-headline text-lg font-semibold text-[var(--text-muted)]">
              {summary.execution}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-panel)] p-3.5">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Visited
            </p>
            <p className="mt-1 font-headline text-lg font-semibold text-[var(--text-muted)]">
              {summary.visited}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-panel)] p-3.5">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Matches
            </p>
            <p className="mt-1 font-headline text-lg font-semibold text-[var(--text-muted)]">
              {summary.match}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-panel)] p-3.5">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Logic
            </p>
            <p className="mt-1 font-headline text-lg font-semibold text-[var(--primary)]">
              {algorithm}
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}
