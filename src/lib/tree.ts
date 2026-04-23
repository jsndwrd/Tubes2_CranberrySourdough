import { Parser } from "html-tokenizer";

export type ElmtNode = {
  type: "element";
  tag: string;
  props: Record<string, string>;
  children: Node[];
};

export type TextNode = { type: "text"; value: string };
export type CommentNode = { type: "comment"; value: string };
export type Node = ElmtNode | TextNode | CommentNode;

export type LcaIndex = {
  nodes: Node[];
  depths: number[];
  parents: number[];
  indexByNode: Map<Node, number>;
  up: number[][];
};

export function Tree(html: string): ElmtNode {
  const root: ElmtNode = {
    type: "element",
    tag: "#document",
    props: {},
    children: [],
  };

  const stack: ElmtNode[] = [root];

  for (const token of Parser.parse(html)) {
    const p = stack[stack.length - 1];

    switch (token.type) {
      case "open": {
        const el: ElmtNode = {
          type: "element",
          tag: token.name,
          props: { ...token.attributes },
          children: [],
        };
        p.children.push(el);
        if (!token.selfClosing) {
          stack.push(el);
        }
        break;
      }
      case "text": {
        if (token.text) {
          p.children.push({ type: "text", value: token.text });
        }
        break;
      }
      case "comment": {
        p.children.push({ type: "comment", value: token.text });
        break;
      }
      case "close": {
        if (token.selfClosing) {
          break;
        }
        const name = token.name.toLowerCase();
        let i = stack.length - 1;
        while (i > 0 && stack[i].tag.toLowerCase() !== name) {
          i--;
        }
        if (i > 0 && stack[i].tag.toLowerCase() === name) {
          stack.length = i;
        }
        break;
      }
    }
  }

  return root;
}

export function buildLcaIndex(root: ElmtNode): LcaIndex {
  const nodes: Node[] = [];
  const depths: number[] = [];
  const parents: number[] = [];
  const indexByNode = new Map<Node, number>();

  function walk(node: Node, parentIndex: number, depth: number) {
    const currentIndex = nodes.length;
    nodes.push(node);
    depths.push(depth);
    parents.push(parentIndex);
    indexByNode.set(node, currentIndex);

    if (node.type !== "element") {
      return;
    }

    for (const child of node.children) {
      walk(child, currentIndex, depth + 1);
    }
  }

  walk(root, -1, 0);

  const maxLog = Math.max(1, Math.ceil(Math.log2(Math.max(1, nodes.length))));
  const up: number[][] = Array.from({ length: maxLog }, () => Array(nodes.length).fill(-1));

  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
    up[0][nodeIndex] = parents[nodeIndex];
  }

  for (let level = 1; level < maxLog; level += 1) {
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const previousAncestor = up[level - 1][nodeIndex];
      up[level][nodeIndex] = previousAncestor === -1 ? -1 : up[level - 1][previousAncestor];
    }
  }

  return { nodes, depths, parents, indexByNode, up };
}

export function findLowestCommonAncestor(
  index: LcaIndex,
  left: Node,
  right: Node,
): Node | null {
  const leftIndex = index.indexByNode.get(left);
  const rightIndex = index.indexByNode.get(right);

  if (leftIndex === undefined || rightIndex === undefined) {
    return null;
  }

  let a = leftIndex;
  let b = rightIndex;

  if (index.depths[a] < index.depths[b]) {
    [a, b] = [b, a];
  }

  const depthDelta = index.depths[a] - index.depths[b];
  for (let level = 0; level < index.up.length; level += 1) {
    if ((depthDelta & (1 << level)) !== 0) {
      a = index.up[level][a];
    }
  }

  if (a === b) {
    return index.nodes[a];
  }

  for (let level = index.up.length - 1; level >= 0; level -= 1) {
    const nextA = index.up[level][a];
    const nextB = index.up[level][b];

    if (nextA !== nextB) {
      a = nextA;
      b = nextB;
    }
  }

  const lcaIndex = index.parents[a];
  return lcaIndex === -1 ? null : index.nodes[lcaIndex];
}

export function getLowestCommonAncestor(root: ElmtNode, left: Node, right: Node): Node | null {
  const index = buildLcaIndex(root);
  return findLowestCommonAncestor(index, left, right);
}
