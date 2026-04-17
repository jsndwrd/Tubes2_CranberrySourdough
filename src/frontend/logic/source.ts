import { Tree } from "../../lib/tree";
import type { RootResolution, SourceMode } from "../types";

type ResolveSourceInput = {
  mode: SourceMode;
  htmlInput: string;
  urlInput: string;
  fetcher?: typeof fetch;
};

export async function resolveSourceRoot({ mode, htmlInput, urlInput, fetcher = fetch }: ResolveSourceInput): Promise<RootResolution> {
  if (mode === "html") {
    const raw = htmlInput.trim();
    if (!raw) {
      throw new Error("HTML input is empty.");
    }

    return { root: Tree(raw), label: "raw HTML" };
  }

  const target = urlInput.trim();
  if (!target) {
    throw new Error("URL input is empty.");
  }

  const response = await fetcher(`/api/scrape?target=${encodeURIComponent(target)}`);
  const payload = (await response.json()) as { content?: string; error?: string };

  if (!response.ok || !payload.content) {
    throw new Error(payload.error ?? "Failed to scrape target URL.");
  }

  return { root: Tree(payload.content), label: target };
}