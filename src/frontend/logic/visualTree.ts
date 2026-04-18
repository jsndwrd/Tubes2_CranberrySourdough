import type { ElmtNode } from "../../lib/tree";
import type { NodeStatus, VisualLayout, VisualLayoutNode, VisualNode } from "../types";
import { elementChildren, getClasses, pathSegment } from "./dom";

const TREE_NODE_WIDTH = 170;
const TREE_NODE_HEIGHT = 82;
const TREE_HORIZONTAL_GAP = 26;
const TREE_VERTICAL_GAP = 88;

type VisualAnchor = {
  id: string;
  center: number;
  y: number;
};

export const VIEWPORT_PADDING = 88;
export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 2.25;
export const ZOOM_STEP = 0.15;
export const WHEEL_ZOOM_INTENSITY = 0.001;

export const statusStyles: Record< NodeStatus, { card: string; meta: string; badge: string; line: string }
> = {
  current: {
    card:
      "border-[#0f5dff]/20 bg-[linear-gradient(145deg,#0f5dff_0%,#6da9ff_100%)] text-white shadow-[0_28px_44px_-30px_rgba(15,93,255,0.82)]",
    meta: "text-white/78",
    badge: "bg-white/16 text-white",
    line: "stroke-[#0f5dff]"
  },
  visited: {
    card:
      "border-[#b8d1bf] bg-[linear-gradient(180deg,#fbfffc_0%,#e6f2e9_100%)] text-[#173523] shadow-[0_24px_38px_-30px_rgba(21,81,44,0.44)]",
    meta: "text-[#486250]",
    badge: "bg-[#173523]/8 text-[#173523]",
    line: "stroke-[#6b8f78]"
  },
  matched: {
    card:
      "border-[#9bceac] bg-[linear-gradient(180deg,#f8fff9_0%,#dbf4e3_100%)] text-[#145132] shadow-[0_24px_38px_-30px_rgba(17,86,25,0.42)]",
    meta: "text-[#2f6a46]",
    badge: "bg-[#145132]/10 text-[#145132]",
    line: "stroke-[#2d8a5a]"
  },
  inactive: {
    card:
      "border-[rgba(166,177,194,0.5)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,246,250,0.94)_100%)] text-[var(--text)] shadow-[0_22px_34px_-30px_rgba(15,23,42,0.52)]",
    meta: "text-[#6d7586]",
    badge: "bg-[#eef2f8] text-[#536174]",
    line: "stroke-[#cad2dd]"
  }
};

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(3))));
}

function visualMeta(node: ElmtNode, childCount: number) {
  const id = node.props.id?.trim();
  if (id) {
    return `#${id}`;
  }

  const classes = getClasses(node);
  if (classes.length > 0) {
    const visible = classes.slice(0, 2).map((item) => `.${item}`).join(" ");
    return classes.length > 2 ? `${visible} +${classes.length - 2}` : visible;
  }

  return childCount > 0 ? `${childCount} child${childCount === 1 ? "" : "ren"}` : "leaf node";
}

export function buildVisualTree(node: ElmtNode, position: number, parents: string[] = [], depth = 0): VisualNode {
  const currentPath = [...parents, pathSegment(node, position)];
  const children = elementChildren(node);

  return {
    id: currentPath.join(" > "),
    label: node.tag.toLowerCase(),
    meta: visualMeta(node, children.length),
    children: children.map((child, index) => buildVisualTree(child, index + 1, currentPath, depth + 1)),
    depth,
    childCount: children.length
  };
}

export function buildVisualLayout(root: VisualNode): VisualLayout {
  const nodes: VisualLayoutNode[] = [];
  const links: VisualLayout["links"] = [];
  let leafIndex = 0;
  let maxDepth = 0;

  function walk(node: VisualNode): VisualAnchor {
    maxDepth = Math.max(maxDepth, node.depth);
    const children = node.children.map(walk);
    const x =
      children.length > 0
        ? (children[0].center + children[children.length - 1].center) / 2 -
          TREE_NODE_WIDTH / 2
        : leafIndex++ * (TREE_NODE_WIDTH + TREE_HORIZONTAL_GAP);
    const y = node.depth * (TREE_NODE_HEIGHT + TREE_VERTICAL_GAP);

    const current: VisualLayoutNode = {
      ...node,
      x,
      y,
      width: TREE_NODE_WIDTH,
      height: TREE_NODE_HEIGHT
    };

    nodes.push(current);

    for (const child of children) {
      const fromX = x + TREE_NODE_WIDTH / 2;
      const fromY = y + TREE_NODE_HEIGHT;
      const toX = child.center;
      const toY = child.y;
      const handle = Math.max(24, (toY - fromY) * 0.55);

      links.push({
        id: `${node.id}->${child.id}`,
        childId: child.id,
        path: `M ${fromX} ${fromY} C ${fromX} ${fromY + handle}, ${toX} ${toY - handle}, ${toX} ${toY}`
      });
    }

    return {
      id: node.id,
      center: x + TREE_NODE_WIDTH / 2,
      y
    };
  }

  walk(root);

  return {
    nodes: [...nodes].sort((left, right) => left.depth - right.depth || left.x - right.x),
    links: links.map((link, index) => ({
      ...link,
      id: `${link.id}-${index}`
    })),
    width: Math.max(...nodes.map((node) => node.x + node.width), TREE_NODE_WIDTH),
    height: Math.max(...nodes.map((node) => node.y + node.height), TREE_NODE_HEIGHT),
    maxDepth,
    totalNodes: nodes.length
  };
}