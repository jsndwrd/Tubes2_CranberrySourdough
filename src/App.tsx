import { Parser } from "html-tokenizer";
import { useEffect, useState } from "react";

function App() {
  const [, setLoading] = useState(false);

  const scrapeUrl = async (targetUrl: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/scrape?target=${encodeURIComponent(targetUrl)}`,
      );
      const res2 = await res.text();
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("application/json")) {
        console.error("Error");
        return;
      }
      const data = JSON.parse(res2) as { content?: string; error?: string };
      if (data.content) {
        for (const token of Parser.parse(data.content)) {
          console.log(token);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrapeUrl("https://github.com/jsndwrd/");
  }, []);

  return (
    <section className="flex items-center justify-center min-h-screen">
      <h1 className="text-center font-bold text-7xl">Cranberry Sourdough</h1>
    </section>
  );
}

export default App;
