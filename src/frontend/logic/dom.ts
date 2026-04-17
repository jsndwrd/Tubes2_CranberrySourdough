import type { ElmtNode, Node } from "../../lib/tree";
import type { ElementMeta, MetaBuildResult, NodeDetails, VisualRootEntry } from "../types";

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

export function getClasses(node: ElmtNode) {
  return (node.props.class ?? "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function shortLabel(node: ElmtNode) {
  const tag = node.tag.toLowerCase();
  const id = node.props.id?.trim();
  if (id) {
    return `<${tag}#${id}>`;
  }

  const classes = getClasses(node);
  if (classes.length > 0) {
    return `<${tag}.${classes[0]}>`;
  }

  return `<${tag}>`;
}

export function badge(node: ElmtNode) {
  const id = node.props.id?.trim();
  if (id) {
    return `ID: ${id}`;
  }

  const classes = getClasses(node);
  if (classes.length > 0) {
    return `CLASS: ${classes[0]}`;
  }

  return `TAG: ${node.tag.toLowerCase()}`;
}

export function pathSegment(node: ElmtNode, position: number) {
  const tag = node.tag.toLowerCase();
  const id = node.props.id?.trim();
  const suffix = `[${position}]`;
  if (id) {
    return `${tag}#${id}${suffix}`;
  }

  const classes = getClasses(node);
  if (classes.length > 0) {
    return `${tag}.${classes[0]}${suffix}`;
  }

  return `${tag}${suffix}`;
}

export function elementChildren(node: ElmtNode) {
  return node.children.filter(
    (child): child is ElmtNode => child.type === "element" && child.tag !== "#document"
  );
}

export function findVisualRoot(root: ElmtNode): VisualRootEntry | null {
  const children = elementChildren(root);
  const htmlIndex = children.findIndex((child) => child.tag.toLowerCase() === "html");
  if (htmlIndex >= 0) {
    return {
      node: children[htmlIndex],
      position: htmlIndex + 1
    };
  }

  if (!children[0]) {
    return null;
  }

  return {
    node: children[0],
    position: 1
  };
}

export function getDefaultSelectedPath(root: ElmtNode) {
  const visualEntry = findVisualRoot(root);
  return visualEntry ? pathSegment(visualEntry.node, visualEntry.position) : null;
}

export function buildMeta(root: ElmtNode): MetaBuildResult {
  const metaMap = new Map<ElmtNode, ElementMeta>();
  const pathMetaMap = new Map<string, ElementMeta>();
  const elements: ElementMeta[] = [];

  function walk(node: Node, parent: ElmtNode | null, path: string[], pathTags: string[], position: number) {
    if (node.type !== "element") {
      return;
    }

    const isDocument = node.tag === "#document";
    const nextPath = isDocument ? path : [...path, pathSegment(node, position)];
    const nextPathTags = isDocument ? pathTags : [...pathTags, node.tag.toLowerCase()];
    const nextParent = isDocument ? null : parent;
    const depth = nextPathTags.length - 1;
    const pathKey = nextPath.join(" > ");

    if (!isDocument) {
      const meta: ElementMeta = {
        node,
        parent: nextParent,
        path: nextPath,
        pathKey,
        pathTags: nextPathTags,
        depth
      };
      metaMap.set(node, meta);
      pathMetaMap.set(pathKey, meta);
      elements.push(meta);
    }

    let elementPosition = 0;
    for (const child of node.children) {
      if (child.type === "element" && child.tag !== "#document") {
        elementPosition += 1;
        walk(child, node, nextPath, nextPathTags, elementPosition);
        continue;
      }

      walk(child, node, nextPath, nextPathTags, 0);
    }
  }

  walk(root, null, [], [], 0);
  return { elements, metaMap, pathMetaMap };
}

export function buildNodeDetails(meta: ElementMeta): NodeDetails {
  const classes = getClasses(meta.node);
  const children = elementChildren(meta.node);

  return {
    id: meta.pathKey,
    path: meta.pathKey,
    pathTags: meta.pathTags,
    shortLabel: shortLabel(meta.node),
    tag: `<${meta.node.tag.toLowerCase()}>`,
    badge: badge(meta.node),
    classes: classes.length > 0 ? classes.map((item) => `.${item}`).join(" ") : "-",
    depth: meta.depth,
    parent: meta.parent ? shortLabel(meta.parent) : "-",
    children: `${children.length} node${children.length === 1 ? "" : "s"}`
  };
}