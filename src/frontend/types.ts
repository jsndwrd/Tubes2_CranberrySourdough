import type { ElmtNode } from "../lib/tree";

export type Algorithm = "BFS" | "DFS";
export type SourceMode = "url" | "html";
export type ResultMode = "top" | "all";
export type NodeStatus = "current" | "visited" | "matched" | "inactive";
export type TraceLevel = "INFO" | "MATCH" | "ERROR";
export type Combinator =
  | "child"
  | "descendant"
  | "adj-sibling"
  | "gen-sibling"
  | null;

export type TraceEntry = {
  time: string;
  level: TraceLevel;
  text: string;
  indent?: number;
};

export type SelectorStep = {
  relation: Combinator;
  tag: string | null;
  id: string | null;
  classes: string[];
  universal: boolean;
};

export type NodeDetails = {
  id: string;
  path: string;
  pathTags: string[];
  shortLabel: string;
  tag: string;
  badge: string;
  classes: string;
  depth: number;
  parent: string;
  children: string;
};

export type ResultItem = NodeDetails & {
  order: string;
};

export type VisualNode = {
  id: string;
  label: string;
  meta: string;
  children: VisualNode[];
  depth: number;
  childCount: number;
};

export type VisualLayoutNode = VisualNode & {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VisualLink = {
  id: string;
  childId: string;
  path: string;
};

export type VisualLayout = {
  nodes: VisualLayoutNode[];
  links: VisualLink[];
  width: number;
  height: number;
  maxDepth: number;
  totalNodes: number;
};

export type VisualRootEntry = {
  node: ElmtNode;
  position: number;
};

export type ElementMeta = {
  node: ElmtNode;
  parent: ElmtNode | null;
  path: string[];
  pathKey: string;
  pathTags: string[];
  depth: number;
};

export type MetaBuildResult = {
  elements: ElementMeta[];
  metaMap: Map<ElmtNode, ElementMeta>;
  pathMetaMap: Map<string, ElementMeta>;
};

export type RunSummary = {
  info: number;
  match: number;
  error: number;
  visited: number;
  execution: string;
  maxDepth: number;
};

export type VisualizerComputedState = {
  results: ResultItem[];
  pathMetaMap: Map<string, ElementMeta> | null;
  selectedPath: string | null;
  traceEntries: TraceEntry[];
  summary: RunSummary;
  statusText: string;
  visitedPaths: string[];
  matchedPaths: string[];
};

export type RootResolution = {
  root: ElmtNode;
  label: string;
};

export type VisualizerSettings = {
  traversalAnimationEnabled: boolean;
  traversalAnimationStepMs: number;
  openInspectorAfterTraversal: boolean;
  openTraceAfterTraversal: boolean;
  autoFitTreeAfterTraversal: boolean;
  multithreadTraversal: boolean;
};
