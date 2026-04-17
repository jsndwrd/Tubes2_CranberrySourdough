import type { VisualizerComputedState, RunSummary } from "./types";

export const defaultStatusText = "No traversal data loaded";
export const INSPECTOR_PANEL_WIDTH = "24rem";
export const INSPECTOR_PANEL_WIDTH_PX = 384;

export const emptySummary: RunSummary = {
  info: 0,
  match: 0,
  error: 0,
  visited: 0,
  execution: "-",
  maxDepth: 0
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
    matchedPaths: []
  };
}
