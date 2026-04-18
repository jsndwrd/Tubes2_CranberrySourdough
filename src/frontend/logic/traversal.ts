import { bfsWalk, dfsWalk } from "../../lib/search";
import type { ElmtNode, Node } from "../../lib/tree";
import { createEmptyComputedState, emptySummary } from "../constants";
import type { Algorithm, ResultItem, ResultMode, TraceEntry, VisualizerComputedState } from "../types";
import { buildMeta, buildNodeDetails, formatTime, getDefaultSelectedPath, shortLabel } from "./dom";
import { matchesGroup, parseSelector } from "./selectors";

export function buildParsedSourceState(root: ElmtNode, label: string): VisualizerComputedState {
  const { pathMetaMap } = buildMeta(root);

  return {
    ...createEmptyComputedState(),
    pathMetaMap,
    selectedPath: getDefaultSelectedPath(root),
    traceEntries: [{ time: formatTime(), level: "INFO", text: `DOM parsed successfully from ${label}.` }],
    statusText: `DOM ready from ${label}.`
  };
}

export function buildTraversalResetState(root: ElmtNode): VisualizerComputedState {
  const { pathMetaMap } = buildMeta(root);

  return {
    ...createEmptyComputedState(),
    pathMetaMap,
    statusText: "Traversal reset. DOM is still loaded."
  };
}

export function buildTraversalErrorState(message: string): VisualizerComputedState {
  return {
    ...createEmptyComputedState(),
    traceEntries: [{ time: formatTime(), level: "ERROR", text: message }],
    summary: { ...emptySummary, error: 1 },
    statusText: message
  };
}

type ExecuteTraversalInput = {
  root: ElmtNode;
  label: string;
  algorithm: Algorithm;
  limit: number;
  resultMode: ResultMode;
  selector: string;
};

export function executeTraversal({ root, label, algorithm, limit, resultMode, selector }: ExecuteTraversalInput): VisualizerComputedState {
  const parsedSelector = parseSelector(selector);
  if (parsedSelector === null) {
    throw new Error("Selector format is not supported.");
  }
  if (parsedSelector.length === 0) {
    throw new Error("CSS selector is empty.");
  }

  const { elements, metaMap, pathMetaMap } = buildMeta(root);
  const nextTrace: TraceEntry[] = [{ time: formatTime(), level: "INFO", text: `Traversal started using ${algorithm} on ${label}.` }];

  const nextVisitedPaths = new Set<string>();
  const nextMatchedPaths = new Set<string>();
  const nextResults: ResultItem[] = [];
  const matchedNodes = new Set<ElmtNode>();

  let infoCount = 1;
  let matchCount = 0;
  let visitedCount = 0;
  let maxDepth = 0;
  const startedAt = performance.now();
  const matchLimit = resultMode === "top" ? Math.max(1, limit) : Number.POSITIVE_INFINITY;

  const visit = (node: Node, depth: number) => {
    visitedCount += 1;
    maxDepth = Math.max(maxDepth, depth);

    if (node.type !== "element" || node.tag === "#document") {
      return;
    }

    const meta = metaMap.get(node);
    if (!meta) {
      return;
    }

    nextVisitedPaths.add(meta.pathKey);
    nextTrace.push({
      time: formatTime(),
      level: "INFO",
      text: `Visiting ${shortLabel(node)} (Depth ${meta.depth})`,
      indent: Math.min(meta.depth, 6)
    });
    infoCount += 1;

    const isMatch = parsedSelector.some((group) => matchesGroup(meta, group, metaMap));
    if (!isMatch || matchedNodes.has(node)) {
      return;
    }

    matchedNodes.add(node);
    nextMatchedPaths.add(meta.pathKey);
    matchCount += 1;

    const result: ResultItem = {
      ...buildNodeDetails(meta),
      order: `#${String(matchCount).padStart(2, "0")}`
    };

    nextResults.push(result);
    nextTrace.push({
      time: formatTime(),
      level: "MATCH",
      text: `Node matched selector: ${result.shortLabel}`,
      indent: Math.min(meta.depth, 6)
    });

    if (matchCount >= matchLimit) {
      return true;
    }
  };

  if (algorithm === "BFS") {
    bfsWalk(root, visit);
  } else {
    dfsWalk(root, visit);
  }

  const execution = `${Math.max(1, Math.round(performance.now() - startedAt))}ms`;

  return {
    results: nextResults,
    pathMetaMap,
    selectedPath: nextResults[0]?.path ?? getDefaultSelectedPath(root),
    traceEntries: nextTrace,
    summary: {
      info: infoCount,
      match: matchCount,
      error: 0,
      visited: visitedCount,
      execution,
      maxDepth: Math.max(maxDepth, elements.length > 0 ? 1 : 0)
    },
    statusText:
      matchCount > 0
        ? `Traversal finished on ${label}.`
        : `Traversal finished on ${label} with no matches.`,
    visitedPaths: [...nextVisitedPaths],
    matchedPaths: [...nextMatchedPaths]
  };
}
