import type { VisualizerComputedState, RunSummary } from "./types";

export const navigation = ["Visualizer", "Library", "Documentation"];

export const defaultStatusText = "No traversal data loaded";

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
    selectedPath: null,
    traceEntries: [],
    summary: emptySummary,
    statusText: defaultStatusText,
    visitedPaths: [],
    matchedPaths: []
  };
}