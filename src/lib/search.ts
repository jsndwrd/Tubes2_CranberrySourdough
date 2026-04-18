import type { ElmtNode, Node } from "./tree";

// Preorder
export function dfsWalk(
  root: Node,
  visit: (node: Node, depth: number) => boolean | void,
  depth = 0,
): void {
  if (visit(root, depth)) {
    return;
  }

  if (root.type === "element") {
    for (const child of root.children) {
      if (dfsWalkUntil(child, visit, depth + 1)) {
        return;
      }
    }
  }
}

function dfsWalkUntil(
  root: Node,
  visit: (node: Node, depth: number) => boolean | void,
  depth: number,
): boolean {
  if (visit(root, depth)) {
    return true;
  }

  if (root.type === "element") {
    for (const child of root.children) {
      if (dfsWalkUntil(child, visit, depth + 1)) {
        return true;
      }
    }
  }

  return false;
}

// DFS
export function dfs(
  root: Node,
  pred: (node: Node) => boolean,
): Node | undefined {
  if (pred(root)) {
    return root;
  }
  if (root.type === "element") {
    for (const child of root.children) {
      const found = dfs(child, pred);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

export function bfsWalk(
  root: Node,
  visit: (node: Node, depth: number) => boolean | void,
): void {
  const queue: { node: Node; depth: number }[] = [{ node: root, depth: 0 }];
  let i = 0;
  while (i < queue.length) {
    const { node, depth } = queue[i++];
    if (visit(node, depth)) {
      return;
    }
    if (node.type === "element") {
      const next = depth + 1;
      for (const child of node.children) {
        queue.push({ node: child, depth: next });
      }
    }
  }
}

// BFS
export function bfs(
  root: Node,
  pred: (node: Node) => boolean,
): Node | undefined {
  const queue: Node[] = [root];
  let i = 0;
  while (i < queue.length) {
    const node = queue[i++];
    if (pred(node)) {
      return node;
    }
    if (node.type === "element") {
      for (const child of node.children) {
        queue.push(child);
      }
    }
  }
  return undefined;
}

export function findElmtsByTag(root: ElmtNode, tag: string): ElmtNode[] {
  const t = tag.toLowerCase();
  const out: ElmtNode[] = [];
  dfsWalk(root, (node) => {
    if (node.type === "element" && node.tag.toLowerCase() === t) {
      out.push(node);
    }
  });
  return out;
}
