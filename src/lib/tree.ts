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
