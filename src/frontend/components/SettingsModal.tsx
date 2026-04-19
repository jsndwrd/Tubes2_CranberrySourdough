import { useEffect } from "react";
import {
  MAX_MAX_PARALLEL_WORKERS,
  MAX_TRAVERSAL_ANIMATION_STEP_MS,
  MIN_MAX_PARALLEL_WORKERS,
  MIN_TRAVERSAL_ANIMATION_STEP_MS,
  TRAVERSAL_ANIMATION_SLIDER_STEP,
} from "../constants";
import type { VisualizerSettings } from "../types";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  onSettingsChange: (next: Partial<VisualizerSettings>) => void;
  settings: VisualizerSettings;
};

type ToggleRowProps = {
  checked: boolean;
  description: string;
  label: string;
  onToggle: () => void;
};

function ToggleRow({ checked, description, label, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-black/5 bg-[var(--surface-low)] px-4 py-3.5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
      </div>
      <button
        aria-pressed={checked}
        className={[
          "mt-0.5 flex h-7 w-12 items-center rounded-full border p-1 transition",
          checked
            ? "justify-end border-[var(--primary)]/24 bg-[var(--primary-soft)]"
            : "justify-start border-black/8 bg-white",
        ].join(" ")}
        onClick={onToggle}
        type="button"
      >
        <span
          className={[
            "h-5 w-5 rounded-full transition",
            checked
              ? "bg-[var(--primary)] shadow-[0_8px_16px_-10px_rgba(0,69,163,0.72)]"
              : "bg-[var(--surface-strong)]",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function describeTraversalSpeed(stepMs: number) {
  if (stepMs >= 180) {
    return "Very slow";
  }
  if (stepMs >= 110) {
    return "Slow";
  }
  if (stepMs >= 55) {
    return "Balanced";
  }
  if (stepMs >= 24) {
    return "Fast";
  }

  return "Very fast";
}

function sliderValueFromStepMs(stepMs: number) {
  return (
    MAX_TRAVERSAL_ANIMATION_STEP_MS + MIN_TRAVERSAL_ANIMATION_STEP_MS - stepMs
  );
}

function stepMsFromSliderValue(sliderValue: number) {
  return (
    MAX_TRAVERSAL_ANIMATION_STEP_MS +
    MIN_TRAVERSAL_ANIMATION_STEP_MS -
    sliderValue
  );
}

export function SettingsModal({
  isOpen,
  onClose,
  onReset,
  onSettingsChange,
  settings,
}: SettingsModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/28 px-4 py-6 backdrop-blur-[6px] md:px-6"
      onClick={onClose}
    >
      <div
        aria-modal="true"
        className="ambient-shadow flex max-h-[min(42rem,calc(100vh-3rem))] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-black/5 bg-[var(--surface-panel)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4 md:px-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
              Visualizer Preferences
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              Settings
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Tune traversal pacing, panel behavior, and canvas display without
              touching the main configuration flow.
            </p>
          </div>
          <button
            aria-label="Close settings dialog"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-white text-[var(--text-muted)] transition hover:border-[var(--primary)]/18 hover:bg-[var(--primary-soft)]/36 hover:text-[var(--primary)]"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 md:px-6 md:py-6">
          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[var(--text)]">
                Traversal Animation
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                Controls whether traversal animates at all, and if it does, how
                slow or fast each visitation step should feel.
              </p>
            </div>
            <div className="grid gap-3">
              <ToggleRow
                checked={settings.traversalAnimationEnabled}
                description="Turn traversal animation on when you want to watch BFS or DFS progress step by step. Turn it off when you want the final state instantly."
                label="Enable traversal animation"
                onToggle={() =>
                  onSettingsChange({
                    traversalAnimationEnabled:
                      !settings.traversalAnimationEnabled,
                  })
                }
              />
            </div>
            {settings.traversalAnimationEnabled ? (
              <div className="rounded-2xl border border-black/5 bg-[var(--surface-low)] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--primary)]">
                      speed
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">
                        Animation Speed
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Current pace:{" "}
                        {describeTraversalSpeed(
                          settings.traversalAnimationStepMs,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full border border-[var(--primary)]/16 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">
                    {settings.traversalAnimationStepMs} ms / step
                  </div>
                </div>
                <div className="space-y-3">
                  <input
                    className="w-full accent-[var(--primary)]"
                    max={MAX_TRAVERSAL_ANIMATION_STEP_MS}
                    min={MIN_TRAVERSAL_ANIMATION_STEP_MS}
                    onChange={(event) =>
                      onSettingsChange({
                        traversalAnimationStepMs: stepMsFromSliderValue(
                          Number(event.target.value),
                        ),
                      })
                    }
                    step={TRAVERSAL_ANIMATION_SLIDER_STEP}
                    type="range"
                    value={sliderValueFromStepMs(
                      settings.traversalAnimationStepMs,
                    )}
                  />
                  <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
                    <span>Very slow</span>
                    <span>Balanced</span>
                    <span>Very fast</span>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="grid gap-3">
              <ToggleRow
                checked={settings.multithreadTraversal}
                description="Traversal DFS/BFS with Multithread."
                label="Parallel / Multithread"
                onToggle={() =>
                  onSettingsChange({
                    multithreadTraversal: !settings.multithreadTraversal,
                  })
                }
              />
            </div>
            {settings.multithreadTraversal ? (
              <div className="rounded-2xl border border-black/5 bg-[var(--surface-low)] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      Max parallel workers
                    </p>
                  </div>
                  <div className="rounded-full border border-[var(--primary)]/16 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">
                    {Math.max(
                      MIN_MAX_PARALLEL_WORKERS,
                      Math.min(
                        MAX_MAX_PARALLEL_WORKERS,
                        settings.maxParallelWorkers,
                      ),
                    )}
                  </div>
                </div>
                <input
                  aria-label="Max parallel workers"
                  className="w-full accent-[var(--primary)]"
                  max={MAX_MAX_PARALLEL_WORKERS}
                  min={MIN_MAX_PARALLEL_WORKERS}
                  onChange={(event) =>
                    onSettingsChange({
                      maxParallelWorkers: Number(event.target.value),
                    })
                  }
                  step={1}
                  type="range"
                  value={Math.max(
                    MIN_MAX_PARALLEL_WORKERS,
                    Math.min(
                      MAX_MAX_PARALLEL_WORKERS,
                      settings.maxParallelWorkers,
                    ),
                  )}
                />
                <div className="mt-2 flex justify-between text-xs font-medium text-[var(--text-muted)]">
                  <span>{MIN_MAX_PARALLEL_WORKERS}</span>
                  <span>{MAX_MAX_PARALLEL_WORKERS}</span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              <ToggleRow
                checked={settings.openInspectorAfterTraversal}
                description="Open the right inspector automatically after each traversal run finishes."
                label="Open inspector after traversal"
                onToggle={() =>
                  onSettingsChange({
                    openInspectorAfterTraversal:
                      !settings.openInspectorAfterTraversal,
                  })
                }
              />
              <ToggleRow
                checked={settings.openTraceAfterTraversal}
                description="Expand the execution trace automatically whenever traversal is executed."
                label="Open trace after traversal"
                onToggle={() =>
                  onSettingsChange({
                    openTraceAfterTraversal: !settings.openTraceAfterTraversal,
                  })
                }
              />
              <ToggleRow
                checked={settings.autoFitTreeAfterTraversal}
                description="Recenter and fit the tree to the viewport after a traversal run completes."
                label="Auto-fit tree after traversal"
                onToggle={() =>
                  onSettingsChange({
                    autoFitTreeAfterTraversal:
                      !settings.autoFitTreeAfterTraversal,
                  })
                }
              />
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-black/5 px-5 py-4 md:px-6">
          <p className="text-sm text-[var(--text-muted)]">
            These settings apply immediately and stay active for the current
            session.
          </p>
          <button
            className="rounded-full border border-black/5 bg-white px-4 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--primary)]/16 hover:bg-[var(--primary-soft)]/36 hover:text-[var(--primary)]"
            onClick={onReset}
            type="button"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
