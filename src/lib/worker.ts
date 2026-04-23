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
  pathSegment,
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

function buildShardPathMap(
  root: ElmtNode,
  parent: ElmtNode,
  shard: ElmtNode[],
): Map<string, string> {
  const { metaMap } = buildMeta(root);
  const parentMeta = metaMap.get(parent);
  const parentKey = parentMeta?.pathKey ?? "";

  const fullPositions = new Map<ElmtNode, number>();
  let fullPos = 0;
  for (const ch of parent.children) {
    if (ch.type === "element" && ch.tag !== "#document") {
      fullPos += 1;
      fullPositions.set(ch as ElmtNode, fullPos);
    }
  }

  const shardSet = new Set(shard);
  let shardPos = 0;
  const map = new Map<string, string>();

  for (const ch of parent.children) {
    if (ch.type !== "element" || ch.tag === "#document") {
      continue;
    }
    const node = ch as ElmtNode;
    if (!shardSet.has(node)) {
      continue;
    }

    shardPos += 1;
    const shardSeg = pathSegment(node, shardPos);
    const fullSeg = pathSegment(node, fullPositions.get(node) ?? shardPos);

    if (shardSeg === fullSeg) {
      continue;
    }

    const shardPrefix = parentKey ? `${parentKey} > ${shardSeg}` : shardSeg;
    const fullPrefix = parentKey ? `${parentKey} > ${fullSeg}` : fullSeg;
    map.set(shardPrefix, fullPrefix);
  }

  return map;
}

function remapPath(p: string, map: Map<string, string>): string {
  for (const [shardPrefix, fullPrefix] of map) {
    if (p === shardPrefix) {
      return fullPrefix;
    }
    if (p.startsWith(`${shardPrefix} > `)) {
      return fullPrefix + p.slice(shardPrefix.length);
    }
  }
  return p;
}

function buildFullShardPathMaps(
  root: ElmtNode,
  parent: ElmtNode,
  shard: ElmtNode[],
): Map<string, string>[] {
  const path = pathToNode(root, parent);
  const maps: Map<string, string>[] = [];

  if (path && path.length >= 3) {
    for (let i = 1; i <= path.length - 2; i++) {
      const ancestor = path[i] as ElmtNode;
      const childOnPath = path[i + 1] as ElmtNode;
      const m = buildShardPathMap(root, ancestor, [childOnPath]);
      if (m.size > 0) {
        maps.push(m);
      }
    }
  }

  const leaf = buildShardPathMap(root, parent, shard);
  if (leaf.size > 0) {
    maps.push(leaf);
  }

  return maps;
}

function remapWorkerState(
  state: VisualizerComputedState,
  maps: Map<string, string>[],
): VisualizerComputedState {
  if (maps.length === 0) {
    return state;
  }

  const remapChain = (p: string) => {
    let s = p;
    for (const m of maps) {
      s = remapPath(s, m);
    }
    return s;
  };

  return {
    ...state,
    visitedPaths: state.visitedPaths.map(remapChain),
    matchedPaths: state.matchedPaths.map(remapChain),
    results: state.results.map((r) => ({
      ...r,
      path: remapChain(r.path),
      id: remapChain(r.id),
    })),
  };
}

function subtreeNodeCount(node: ElmtNode): number {
  let count = 1;
  for (const ch of node.children) {
    if (ch.type === "element") {
      count += subtreeNodeCount(ch as ElmtNode);
    }
  }
  return count;
}

type SplitBranch = {
  parent: ElmtNode;
  node: ElmtNode;
  size: number;
};

function balancedSplitShards(
  root: ElmtNode,
  bucketTarget: number,
): { parent: ElmtNode; shard: ElmtNode[] }[] {
  if (bucketTarget <= 1) {
    return [];
  }

  const branching = splitPoint(root);
  if (!branching) {
    return [];
  }

  const { parent: initialParent, siblings } = branching;
  let branches: SplitBranch[] = siblings.map((node) => ({
    parent: initialParent,
    node,
    size: subtreeNodeCount(node),
  }));

  while (branches.length < bucketTarget) {
    let bestIdx = -1;
    let bestSize = -1;
    for (let i = 0; i < branches.length; i++) {
      const kids = elementChildren(branches[i].node);
      if (kids.length >= 2 && branches[i].size > bestSize) {
        bestSize = branches[i].size;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      break;
    }

    const chosen = branches[bestIdx];
    const kids = elementChildren(chosen.node);
    const expanded: SplitBranch[] = kids.map((node) => ({
      parent: chosen.node,
      node,
      size: subtreeNodeCount(node),
    }));
    branches.splice(bestIdx, 1, ...expanded);
  }

  const byParent = new Map<ElmtNode, SplitBranch[]>();
  for (const b of branches) {
    const list = byParent.get(b.parent) ?? [];
    list.push(b);
    byParent.set(b.parent, list);
  }

  const totalSize = branches.reduce((sum, b) => sum + b.size, 0);
  if (totalSize === 0) {
    return [];
  }

  type ParentGroup = {
    parent: ElmtNode;
    branches: SplitBranch[];
    groupSize: number;
  };
  const parentGroups: ParentGroup[] = [...byParent.entries()].map(
    ([parent, list]) => ({
      parent,
      branches: list,
      groupSize: list.reduce((s, b) => s + b.size, 0),
    }),
  );

  parentGroups.sort((a, b) => b.groupSize - a.groupSize);

  const quotas = parentGroups.map(
    (g) => (g.groupSize / totalSize) * bucketTarget,
  );
  const fractional = quotas.map((q) => q - Math.floor(q));

  let bucketCounts = quotas.map((q) => Math.max(1, Math.floor(q)));
  let sumBuckets = bucketCounts.reduce((a, b) => a + b, 0);

  if (sumBuckets > bucketTarget) {
    let excess = sumBuckets - bucketTarget;
    const order = [...bucketCounts.keys()].sort(
      (i, j) => bucketCounts[j] - bucketCounts[i],
    );
    for (const idx of order) {
      if (excess === 0) break;
      const canRemove = bucketCounts[idx] - 1;
      if (canRemove > 0) {
        const take = Math.min(canRemove, excess);
        bucketCounts[idx] -= take;
        excess -= take;
      }
    }
  } else if (sumBuckets < bucketTarget) {
    let deficit = bucketTarget - sumBuckets;
    const remainderOrder = [...quotas.keys()].sort(
      (i, j) => fractional[j] - fractional[i],
    );
    let r = 0;
    while (deficit > 0 && r < remainderOrder.length * bucketTarget) {
      bucketCounts[remainderOrder[r % remainderOrder.length]] += 1;
      deficit -= 1;
      r += 1;
    }
  }

  sumBuckets = bucketCounts.reduce((a, b) => a + b, 0);
  if (sumBuckets > bucketTarget) {
    let excess = sumBuckets - bucketTarget;
    const order = [...bucketCounts.keys()].sort(
      (i, j) => bucketCounts[j] - bucketCounts[i],
    );
    for (const idx of order) {
      if (excess === 0) break;
      const canRemove = bucketCounts[idx] - 1;
      if (canRemove > 0) {
        const take = Math.min(canRemove, excess);
        bucketCounts[idx] -= take;
        excess -= take;
      }
    }
  }

  const out: { parent: ElmtNode; shard: ElmtNode[] }[] = [];

  for (let gi = 0; gi < parentGroups.length; gi++) {
    const { parent, branches: groupBranches } = parentGroups[gi];
    let k = Math.max(1, bucketCounts[gi]);
    k = Math.min(k, Math.max(1, groupBranches.length));
    const sorted = [...groupBranches].sort((a, b) => b.size - a.size);
    const loads: number[] = Array.from({ length: k }, () => 0);
    const buckets: ElmtNode[][] = Array.from({ length: k }, () => []);

    for (const br of sorted) {
      let minIdx = 0;
      for (let j = 1; j < k; j++) {
        if (loads[j] < loads[minIdx]) {
          minIdx = j;
        }
      }
      buckets[minIdx].push(br.node);
      loads[minIdx] += br.size;
    }

    for (const shard of buckets) {
      if (shard.length > 0) {
        out.push({ parent, shard });
      }
    }
  }

  return out;
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
  userCap: number,
  blocks: TraceEntry[][],
  wallMs: number,
): TraceEntry[] {
  const capNote =
    workerCount < userCap
      ? ` (${String(userCap)} configured, using ${String(workerCount)} - limited by DOM structure / shard layout)`
      : "";
  const header: TraceEntry[] = [
    {
      time: formatTime(),
      level: "INFO",
      text: `Parallel traversal: ${String(workerCount)} worker${workerCount === 1 ? "" : "s"} finished in ${String(wallMs)}ms (wall clock).${capNote}`,
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
  userCap: number;
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
    userCap,
  } = options;

  const maxWorkerMs = Math.max(
    1,
    ...states.map((s) => Math.max(1, parseInt(s.summary.execution) || 1)),
  );

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

  const traceEntries = mergeBlocks(workerCount, userCap, traceBlocks, wallMs);

  const completionMessage = stoppedByLimit
    ? `Traversal stopped after reaching top ${String(matchLimit)} match${matchLimit === 1 ? "" : "es"} (parallel, wall: ${String(wallMs)}ms).`
    : capped.length > 0
      ? `Parallel traversal finished on ${label} with ${String(capped.length)} match${capped.length === 1 ? "" : "es"} (wall: ${String(wallMs)}ms).`
      : `Parallel traversal finished on ${label} with no matches (wall: ${String(wallMs)}ms).`;

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
      execution: `${maxWorkerMs}ms`,
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
  const hw =
    typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? 4) : 4;
  const bucketTarget = Math.min(userCap, hw);
  const splitShards = balancedSplitShards(root, bucketTarget);

  if (splitShards.length === 0) {
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

  const shardMaps = splitShards.map(({ parent, shard }) =>
    buildFullShardPathMaps(root, parent, shard),
  );

  const payloads: TWorker[] = splitShards.map(({ parent, shard }) => ({
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
  const remapped = settled.map((state, i) =>
    remapWorkerState(state, shardMaps[i] ?? []),
  );

  const wallMs = Math.max(1, Math.round(performance.now() - started));

  return mergeRes({
    states: remapped,
    root,
    label,
    algorithm,
    resultMode,
    limit,
    workerCount: settled.length,
    wallMs,
    userCap,
  });
}
