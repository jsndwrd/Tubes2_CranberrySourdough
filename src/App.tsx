import { useMemo, useState } from "react";
import type { ElmtNode } from "./lib/tree";
import { createEmptyComputedState } from "./frontend/constants";
import { AppHeader } from "./frontend/components/AppHeader";
import { ConfigurationPanel } from "./frontend/components/ConfigurationPanel";
import { ExecutionTrace } from "./frontend/components/ExecutionTrace";
import { InspectorSidebar } from "./frontend/components/InspectorSidebar";
import { TreeExplorer } from "./frontend/components/TreeExplorer";
import { buildMeta, buildNodeDetails, findVisualRoot } from "./frontend/logic/dom";
import { resolveSourceRoot } from "./frontend/logic/source";
import { buildParsedSourceState, buildTraversalErrorState, executeTraversal, } from "./frontend/logic/traversal";
import { buildVisualLayout, buildVisualTree, } from "./frontend/logic/visualTree";
import type { Algorithm, ResultMode, SourceMode } from "./frontend/types";

function App() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("BFS");
  const [sourceMode, setSourceMode] = useState<SourceMode>("html");
  const [resultMode, setResultMode] = useState<ResultMode>("top");
  const [isTraceOpen, setIsTraceOpen] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [htmlInput, setHtmlInput] = useState("");
  const [selector, setSelector] = useState("");
  const [limitInput, setLimitInput] = useState("10");
  const [parsedRoot, setParsedRoot] = useState<ElmtNode | null>(null);
  const [computedState, setComputedState] = useState(createEmptyComputedState);

  const {
    results,
    selectedPath,
    traceEntries,
    summary,
    statusText,
    visitedPaths,
    matchedPaths,
  } = computedState;

  const limitValue = Math.max(1, Number.parseInt(limitInput, 10) || 10);
  const visibleResults = resultMode === "top" ? results.slice(0, limitValue) : results;
  const visitedPathSet = useMemo(() => new Set(visitedPaths), [visitedPaths]);
  const matchedPathSet = useMemo(() => new Set(matchedPaths), [matchedPaths]);
  const visualRoot = useMemo(
    () => (parsedRoot ? findVisualRoot(parsedRoot) : null),
    [parsedRoot],
  );
  const visualTree = useMemo(
    () =>
      visualRoot ? buildVisualTree(visualRoot.node, visualRoot.position) : null,
    [visualRoot],
  );
  const visualLayout = useMemo(
    () => (visualTree ? buildVisualLayout(visualTree) : null),
    [visualTree],
  );
  const pathMetaMap = useMemo(
    () => (parsedRoot ? buildMeta(parsedRoot).pathMetaMap : null),
    [parsedRoot],
  );
  const selectedDetails = useMemo(() => {
    if (!selectedPath || !pathMetaMap) {
      return null;
    }

    const meta = pathMetaMap.get(selectedPath);
    return meta ? buildNodeDetails(meta) : null;
  }, [pathMetaMap, selectedPath]);

  function getStatus(path: string) {
    if (selectedPath === path) {
      return "current" as const;
    }
    if (matchedPathSet.has(path)) {
      return "matched" as const;
    }
    if (visitedPathSet.has(path)) {
      return "visited" as const;
    }
    return "inactive" as const;
  }

  async function resolveCurrentSource(mode: SourceMode) {
    return resolveSourceRoot({mode, htmlInput, urlInput,});
  }

  async function parseCurrentSource(mode: SourceMode) {
    setIsBusy(true);
    try {
      const { root, label } = await resolveCurrentSource(mode);
      setParsedRoot(root);
      setComputedState(buildParsedSourceState(root, label));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to parse the DOM.";
      setParsedRoot(null);
      setComputedState(buildTraversalErrorState(message));
    } finally {
      setIsBusy(false);
    }
  }

  async function runTraversal() {
    setIsBusy(true);
    try {
      const { root, label } = await resolveCurrentSource(sourceMode);
      const nextState = executeTraversal({root, label, algorithm, selector,});

      setParsedRoot(root);
      setComputedState(nextState);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run traversal.";
      setComputedState(buildTraversalErrorState(message));
    } finally {
      setIsBusy(false);
    }
  }

  function resetForm() {
    setAlgorithm("BFS");
    setSourceMode("html");
    setResultMode("top");
    setUrlInput("");
    setHtmlInput("");
    setSelector("");
    setLimitInput("10");
    setParsedRoot(null);
    setComputedState(createEmptyComputedState());
  }

  function selectPath(path: string) {
    setComputedState((current) => ({
      ...current,
      selectedPath: path,
    }));
  }

  function clearTrace() {
    setComputedState((current) => ({
      ...current,
      traceEntries: [],
    }));
  }

  return (
    <div className="bg-[var(--background)] xl:h-screen xl:overflow-hidden">
      <div className="min-h-screen xl:flex xl:h-full xl:flex-col">
        <AppHeader isBusy={isBusy} onExecute={runTraversal} />

        <div className="flex flex-1 flex-col xl:flex-row xl:overflow-hidden">
          <ConfigurationPanel
            algorithm={algorithm}
            htmlInput={htmlInput}
            isBusy={isBusy}
            limitInput={limitInput}
            onAlgorithmChange={setAlgorithm}
            onHtmlInputChange={setHtmlInput}
            onLimitInputChange={setLimitInput}
            onParseSource={parseCurrentSource}
            onReset={resetForm}
            onResultModeChange={setResultMode}
            onRunTraversal={runTraversal}
            onSelectorChange={setSelector}
            onSourceModeChange={setSourceMode}
            onUrlInputChange={setUrlInput}
            resultMode={resultMode}
            selector={selector}
            sourceMode={sourceMode}
            urlInput={urlInput}
          />

          <main className="flex min-w-0 flex-1 flex-col bg-[var(--surface-muted)] p-4 md:p-5 xl:overflow-hidden">
            <TreeExplorer
              getStatus={getStatus}
              layout={visualLayout}
              onSelect={selectPath}
              statusText={statusText}
            />
          </main>

          <InspectorSidebar
            algorithm={algorithm}
            onSelectPath={selectPath}
            selectedDetails={selectedDetails}
            selectedPath={selectedPath}
            summary={summary}
            visibleResults={visibleResults}
          />
        </div>

        <ExecutionTrace
          isOpen={isTraceOpen}
          onClear={clearTrace}
          onToggle={() => setIsTraceOpen((value) => !value)}
          summary={summary}
          traceEntries={traceEntries}
        />
      </div>
    </div>
  );
}

export default App;