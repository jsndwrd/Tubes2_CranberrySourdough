import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const timeout = 30000;

export async function scrapes(
  target: string | null,
): Promise<{ content: string }> {
  if (!target) {
    throw new Error("Error");
  }

  const href = new URL(target).href;
  const res = await fetch(href, {
    signal: AbortSignal.timeout(timeout),
  });
  const content = await res.text();
  return { content };
}

function scrapeMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const path = req.url ?? "";
  if (!path.startsWith("/api/scrape")) {
    next();
    return;
  }

  void (async () => {
    try {
      const params = new URL(`http://localhost${path}`).searchParams;
      const target = params.get("target") ?? params.get("url");
      const { content } = await scrapes(target);

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-cache");
      res.end(JSON.stringify({ content }));
    } catch {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Error" }));
    }
  })();
}

export const scrape = (): Plugin => ({
  name: "scrape",
  enforce: "pre",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use(scrapeMiddleware);
  },
  configurePreviewServer(server) {
    server.middlewares.use(scrapeMiddleware);
  },
});
