const PORT = Number(Bun.env.PORT ?? 3000);
const REQUEST_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

const defaultHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Cache-Control": "no-store",
} as const;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: defaultHeaders,
  });
}

function handleError(error: unknown) {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return json({ error: "Upstream request timed out." }, 504);
  }

  if (error instanceof Error) {
    return json({ error: error.message || "Failed to scrape target URL." }, 502);
  }

  return json({ error: "Failed to scrape target URL." }, 502);
}

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: defaultHeaders,
      });
    }

    if (url.pathname === "/health") {
      return new Response("ok", {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    if (url.pathname !== "/api/scrape") {
      return json({ error: "Not found." }, 404);
    }

    const target = url.searchParams.get("target") ?? url.searchParams.get("url");
    if (!target) {
      return json({ error: "Missing target URL." }, 400);
    }

    let normalizedUrl: URL;

    try {
      normalizedUrl = new URL(target);
    } catch {
      return json({ error: "Invalid target URL." }, 400);
    }

    try {
      const upstreamResponse = await fetch(normalizedUrl, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": USER_AGENT,
        },
      });

      if (!upstreamResponse.ok) {
        return json(
          { error: `Upstream request failed with status ${upstreamResponse.status}.` },
          502,
        );
      }

      const content = await upstreamResponse.text();

      return json({
        content,
        fetchedUrl: normalizedUrl.toString(),
      });
    } catch (error) {
      return handleError(error);
    }
  },
});

console.log(`Scrape API listening on http://${server.hostname}:${server.port}`);
