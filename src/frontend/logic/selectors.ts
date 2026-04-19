import type { ElmtNode } from "../../lib/tree";
import { elementChildren, getClasses } from "./dom";
import type { Combinator, ElementMeta, SelectorStep } from "../types";

function parseSimpleSelector(
  token: string,
): Omit<SelectorStep, "relation"> | null {
  if (token === "*") {
    return {
      tag: null,
      id: null,
      classes: [],
      universal: true,
    };
  }

  const matches = [...token.matchAll(/(^[a-zA-Z][\w-]*)|([#.][\w-]+)/g)];
  if (matches.length === 0) {
    return null;
  }

  const joined = matches.map(([value]) => value).join("");
  if (joined !== token) {
    return null;
  }

  let tag: string | null = null;
  let id: string | null = null;
  const classes: string[] = [];

  for (const [value] of matches) {
    if (value.startsWith(".")) {
      classes.push(value.slice(1));
    } else if (value.startsWith("#")) {
      id = value.slice(1);
    } else {
      tag = value.toLowerCase();
    }
  }

  return {
    tag,
    id,
    classes,
    universal: false,
  };
}

function parseSelectorGroup(group: string): SelectorStep[] | null {
  const tokens = group
    .replace(/\s*>\s*/g, " > ")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s*~\s*/g, " ~ ")
    .trim()
    .split(/\s+/);
  if (
    tokens.length === 0 ||
    tokens[0] === ">" ||
    tokens[0] === "+" ||
    tokens[0] === "~"
  ) {
    return null;
  }

  const steps: SelectorStep[] = [];
  let relation: Exclude<Combinator, null> = "descendant";

  for (const token of tokens) {
    if (token === ">") {
      relation = "child";
      continue;
    }
    if (token === "+") {
      relation = "adj-sibling";
      continue;
    }
    if (token === "~") {
      relation = "gen-sibling";
      continue;
    }

    const simple = parseSimpleSelector(token);
    if (!simple) {
      return null;
    }

    steps.push({
      ...simple,
      relation: steps.length === 0 ? null : relation,
    });
    relation = "descendant";
  }

  const last = tokens[tokens.length - 1];
  if (last === ">" || last === "+" || last === "~") {
    return null;
  }

  return steps;
}

export function parseSelector(selector: string) {
  const parts = selector
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [];
  }

  const groups = parts.map(parseSelectorGroup);
  if (groups.some((group) => group === null)) {
    return null;
  }

  return groups as SelectorStep[][];
}

function matchesStep(meta: ElementMeta, step: SelectorStep) {
  const tag = meta.node.tag.toLowerCase();
  const id = meta.node.props.id?.trim() ?? null;
  const classes = getClasses(meta.node);

  if (!step.universal && step.tag && tag !== step.tag) {
    return false;
  }

  if (step.id && id !== step.id) {
    return false;
  }

  return step.classes.every((className) => classes.includes(className));
}

export function matchesGroup(
  meta: ElementMeta,
  group: SelectorStep[],
  metaMap: Map<ElmtNode, ElementMeta>,
  index = group.length - 1,
): boolean {
  if (!matchesStep(meta, group[index])) {
    return false;
  }

  if (index === 0) {
    return true;
  }

  const relation = group[index].relation;
  const parent = meta.parent ? (metaMap.get(meta.parent) ?? null) : null;

  if (!parent) {
    return false;
  }

  if (relation === "child") {
    return matchesGroup(parent, group, metaMap, index - 1);
  }

  if (relation === "adj-sibling") {
    const siblings = elementChildren(parent.node);
    const idx = siblings.indexOf(meta.node);
    if (idx <= 0) {
      return false;
    }
    const prevMeta = metaMap.get(siblings[idx - 1]);
    return prevMeta ? matchesGroup(prevMeta, group, metaMap, index - 1) : false;
  }

  if (relation === "gen-sibling") {
    const siblings = elementChildren(parent.node);
    const idx = siblings.indexOf(meta.node);
    for (let i = 0; i < idx; i++) {
      const sibMeta = metaMap.get(siblings[i]);
      if (sibMeta && matchesGroup(sibMeta, group, metaMap, index - 1)) {
        return true;
      }
    }
    return false;
  }

  let ancestor: ElementMeta | null = parent;
  while (ancestor) {
    if (matchesGroup(ancestor, group, metaMap, index - 1)) {
      return true;
    }
    ancestor = ancestor.parent ? (metaMap.get(ancestor.parent) ?? null) : null;
  }

  return false;
}
