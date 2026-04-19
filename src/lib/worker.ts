import { executeTraversal } from "../frontend/logic/traversal";
import type {
  Algorithm,
  ResultMode,
  VisualizerComputedState,
} from "../frontend/types";
import type { ElmtNode } from "./tree";

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
