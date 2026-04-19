import type {
  VisualizerComputedState,
  VisualizerSettings,
  RunSummary,
} from "./types";

export const defaultStatusText = "No traversal data loaded";
export const INSPECTOR_PANEL_WIDTH = "24rem";
export const INSPECTOR_PANEL_WIDTH_PX = 384;
export const TRAVERSAL_ANIMATION_STEP_MS = 42;
export const MIN_TRAVERSAL_ANIMATION_STEP_MS = 8;
export const MAX_TRAVERSAL_ANIMATION_STEP_MS = 500;
export const TRAVERSAL_ANIMATION_SLIDER_STEP = 2;
export const TRAVERSAL_MATCH_FLASH_MS = 320;

export const emptySummary: RunSummary = {
  info: 0,
  match: 0,
  error: 0,
  visited: 0,
  execution: "-",
  maxDepth: 0,
};

export function createEmptyComputedState(): VisualizerComputedState {
  return {
    results: [],
    pathMetaMap: null,
    selectedPath: null,
    traceEntries: [],
    summary: emptySummary,
    statusText: defaultStatusText,
    visitedPaths: [],
    matchedPaths: [],
  };
}

export function createDefaultSettings(): VisualizerSettings {
  return {
    traversalAnimationEnabled: true,
    traversalAnimationStepMs: TRAVERSAL_ANIMATION_STEP_MS,
    openInspectorAfterTraversal: true,
    openTraceAfterTraversal: true,
    autoFitTreeAfterTraversal: false,
    multithreadTraversal: false,
  };
}
