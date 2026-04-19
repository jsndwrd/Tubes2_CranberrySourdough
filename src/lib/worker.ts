import { bfsWalk, dfsWalk } from "./search";
import type { ElmtNode, Node } from "./tree";
import { executeTraversal } from "../frontend/logic/traversal";
import type {
  Algorithm,
  ResultMode,
  ResultItem,
  TraceEntry,
  VisualizerComputedState,
} from "../frontend/types";
import {
  DEFAULT_MAX_PARALLEL_WORKERS,
  MAX_MAX_PARALLEL_WORKERS,
  MIN_MAX_PARALLEL_WORKERS,
} from "../frontend/constants";
import {
  buildMeta,
  elementChildren,
  formatTime,
  getDefaultSelectedPath,
} from "../frontend/logic/dom";

export type TWorker = {
  treeJson: string;
  label: string;
  algorithm: Algorithm;
  limit: number;
  resultMode: ResultMode;
  selector: string;
};

export type TWRes =
  | { ok: true; state: VisualizerComputedState }
  | { ok: false; message: string };

export type TPInput = {
  root: ElmtNode;
  label: string;
  algorithm: Algorithm;
  limit: number;
  resultMode: ResultMode;
  selector: string;
  maxParallelWorkers: number;
};

// Main thread has `window`, to avoid registering in app
const isWorker = typeof globalThis !== "undefined" && !("window" in globalThis);

if (isWorker) {
  self.onmessage = (event: MessageEvent<TWorker>) => {
    try {
      const { treeJson, label, algorithm, limit, resultMode, selector } =
        event.data;
      const root = JSON.parse(treeJson) as ElmtNode;
      const state = executeTraversal({
        root,
        label,
        algorithm,
        limit,
        resultMode,
        selector,
      });
      const payload: TWRes = { ok: true, state };
      self.postMessage(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const payload: TWRes = { ok: false, message };
      self.postMessage(payload);
    }
  };
}

function pathToNode(root: ElmtNode, target: ElmtNode): ElmtNode[] | null {
  if (root === target) {
    return [root];
  }

  for (const child of root.children) {
    if (child.type !== "element") {
      continue;
    }

    const rest = pathToNode(child as ElmtNode, target);
    if (rest) {
      return [root, ...rest];
    }
  }

  return null;
}

// First node with more than 2 element children after searchWalk single chain
function splitPoint(
  root: ElmtNode,
): { parent: ElmtNode; siblings: ElmtNode[] } | null {
  let current = root;
  let kids = elementChildren(current);
  let guard = 0;

  while (kids.length === 1 && guard < 256) {
    current = kids[0];
    kids = elementChildren(current);
    guard += 1;
  }

  if (kids.length <= 1) {
    return null;
  }

  return { parent: current, siblings: kids };
}

function cloneShard(
  root: ElmtNode,
  parent: ElmtNode,
  shard: ElmtNode[],
): ElmtNode {
  const path = pathToNode(root, parent);
  if (!path?.length) {
    throw new Error("Cannot locate branching parent in DOM tree.");
  }

  const shardSet = new Set(shard);
  const pCopy = JSON.parse(JSON.stringify(parent)) as ElmtNode;
  pCopy.children = parent.children
    .filter(
      (ch): ch is ElmtNode =>
        ch.type === "element" && shardSet.has(ch as ElmtNode),
    )
    .map((ch) => JSON.parse(JSON.stringify(ch)) as ElmtNode);

  let bottom = pCopy;
  for (let i = path.length - 2; i >= 1; i--) {
    const ancCopy = JSON.parse(JSON.stringify(path[i])) as ElmtNode;
    ancCopy.children = [bottom];
    bottom = ancCopy;
  }

  const doc = JSON.parse(JSON.stringify(path[0])) as ElmtNode;
  doc.children = [bottom];
  return doc;
}

// Split items evenly
function partitionShards<T>(items: T[], bucketCount: number): T[][] {
  if (bucketCount <= 0) {
    return [items];
  }

  const buckets: T[][] = Array.from({ length: bucketCount }, () => []);
  for (let i = 0; i < items.length; i++) {
    buckets[i % bucketCount].push(items[i]);
  }

  return buckets.filter((b) => b.length > 0);
}

// reorder shard results
function visitPathOrder(root: ElmtNode, algorithm: Algorithm): string[] {
  const { metaMap } = buildMeta(root);
  const order: string[] = [];

  const visit = (node: Node) => {
    if (node.type !== "element" || node.tag === "#document") {
      return;
    }

    const meta = metaMap.get(node as ElmtNode);
    if (meta) {
      order.push(meta.pathKey);
    }
  };

  if (algorithm === "BFS") {
    bfsWalk(root, visit);
  } else {
    dfsWalk(root, visit);
  }

  return order;
}

function runWorker(payload: TWorker): Promise<VisualizerComputedState> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent<TWRes>) => {
      worker.terminate();
      const data = event.data;
      if (!data.ok) {
        reject(new Error(data.message));
        return;
      }

      resolve(data.state);
    };

    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };

    worker.postMessage(payload);
  });
}

function mergeBlocks(
  workerCount: number,
  blocks: TraceEntry[][],
  wallMs: number,
): TraceEntry[] {
  const header: TraceEntry[] = [
    {
      time: formatTime(),
      level: "INFO",
      text: `Parallel traversal: ${String(workerCount)} worker${workerCount === 1 ? "" : "s"} finished in ${String(wallMs)}ms (wall clock).`,
    },
  ];

  const out: TraceEntry[] = [...header];

  for (let i = 0; i < blocks.length; i++) {
    out.push({
      time: formatTime(),
      level: "INFO",
      text: `- Worker ${String(i + 1)}/${String(workerCount)} -`,
    });
    out.push(...blocks[i]);
  }

  return out;
}

function mergeRes(options: {
  states: VisualizerComputedState[];
  root: ElmtNode;
  label: string;
  algorithm: Algorithm;
  resultMode: ResultMode;
  limit: number;
  workerCount: number;
  wallMs: number;
}): VisualizerComputedState {
  const {
    states,
    root,
    label,
    algorithm,
    resultMode,
    limit,
    workerCount,
    wallMs,
  } = options;

  const { pathMetaMap } = buildMeta(root);
  const visitOrder = visitPathOrder(root, algorithm);
  const visitIndex = new Map<string, number>();
  for (let i = 0; i < visitOrder.length; i++) {
    visitIndex.set(visitOrder[i], i);
  }

  const unionVisited = new Set<string>();
  const allResults: ResultItem[] = [];
  let maxDepth = 0;
  let totalVisited = 0;
  let totalInfo = 0;
  const traceBlocks: TraceEntry[][] = [];

  for (const state of states) {
    totalVisited += state.summary.visited;
    totalInfo += state.summary.info;
    maxDepth = Math.max(maxDepth, state.summary.maxDepth);
    for (const p of state.visitedPaths) {
      unionVisited.add(p);
    }
    for (const r of state.results) {
      allResults.push(r);
    }
    traceBlocks.push(state.traceEntries);
  }

  const byPath = new Map<string, ResultItem>();
  for (const item of allResults) {
    if (!byPath.has(item.path)) {
      byPath.set(item.path, item);
    }
  }

  const uniqueMatches = [...byPath.values()].sort((a, b) => {
    const ia = visitIndex.get(a.path) ?? 0;
    const ib = visitIndex.get(b.path) ?? 0;
    return ia - ib;
  });

  const matchLimit =
    resultMode === "top" ? Math.max(1, limit) : uniqueMatches.length;
  const capped = uniqueMatches.slice(0, matchLimit);
  const stoppedByLimit =
    resultMode === "top" && uniqueMatches.length > matchLimit;

  const nextResults: ResultItem[] = capped.map((item, i) => ({
    ...item,
    order: `#${String(i + 1).padStart(2, "0")}`,
  }));

  const matchedPathsOrdered = visitOrder.filter((p) =>
    capped.some((r) => r.path === p),
  );

  const visitedPathsOrdered = visitOrder.filter((p) => unionVisited.has(p));

  const traceEntries = mergeBlocks(workerCount, traceBlocks, wallMs);

  const completionMessage = stoppedByLimit
    ? `Traversal stopped after reaching top ${String(matchLimit)} match${matchLimit === 1 ? "" : "es"} (parallel).`
    : capped.length > 0
      ? `Parallel traversal finished on ${label} with ${String(capped.length)} match${capped.length === 1 ? "" : "es"}.`
      : `Parallel traversal finished on ${label} with no matches.`;

  return {
    results: nextResults,
    pathMetaMap,
    selectedPath: nextResults[0]?.path ?? getDefaultSelectedPath(root),
    traceEntries,
    summary: {
      info: totalInfo + workerCount + 1,
      match: nextResults.length,
      error: 0,
      visited: totalVisited,
      execution: `${Math.max(1, wallMs)}ms`,
      maxDepth: Math.max(maxDepth, visitOrder.length > 0 ? 1 : 0),
    },
    statusText: completionMessage,
    visitedPaths: visitedPathsOrdered,
    matchedPaths: matchedPathsOrdered,
  };
}

function rebind(
  root: ElmtNode,
  state: VisualizerComputedState,
): VisualizerComputedState {
  const { pathMetaMap: _w, ...rest } = state;
  const { pathMetaMap } = buildMeta(root);
  return { ...rest, pathMetaMap };
}

export async function parallelTraverse(
  input: TPInput,
): Promise<VisualizerComputedState> {
  const {
    root,
    label,
    algorithm,
    limit,
    resultMode,
    selector,
    maxParallelWorkers,
  } = input;
  const userCap = Math.max(
    MIN_MAX_PARALLEL_WORKERS,
    Math.min(
      MAX_MAX_PARALLEL_WORKERS,
      Number.isFinite(maxParallelWorkers) && maxParallelWorkers > 0
        ? Math.floor(maxParallelWorkers)
        : DEFAULT_MAX_PARALLEL_WORKERS,
    ),
  );
  const started = performance.now();
  const branching = splitPoint(root);

  if (!branching) {
    const state = await runWorker({
      treeJson: JSON.stringify(root),
      label,
      algorithm,
      limit,
      resultMode,
      selector,
    });
    return rebind(root, state);
  }

  const { parent, siblings } = branching;
  const hw =
    typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? 4) : 4;
  const bucketTarget = Math.min(userCap, Math.min(siblings.length, hw));
  const shards = partitionShards(siblings, bucketTarget);

  const payloads: TWorker[] = shards.map((shard) => ({
    treeJson: JSON.stringify(cloneShard(root, parent, shard)),
    label,
    algorithm,
    limit: Number.POSITIVE_INFINITY,
    resultMode: "all",
    selector,
  }));

  const settled = await Promise.all(
    payloads.map((payload) => runWorker(payload)),
  );

  const wallMs = Math.max(1, Math.round(performance.now() - started));

  return mergeRes({
    states: settled,
    root,
    label,
    algorithm,
    resultMode,
    limit,
    workerCount: settled.length,
    wallMs,
  });
}
