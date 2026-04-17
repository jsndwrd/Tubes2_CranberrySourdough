import { useEffect, useMemo, useRef, useState } from "react";
import type { ElmtNode } from "./lib/tree";
import { createDefaultSettings, createEmptyComputedState, INSPECTOR_PANEL_WIDTH, TRAVERSAL_MATCH_FLASH_MS } from "./frontend/constants";
import { AboutModal } from "./frontend/components/AboutModal";
import { AppHeader } from "./frontend/components/AppHeader";
import { ConfigurationPanel } from "./frontend/components/ConfigurationPanel";
import { ExecutionTrace } from "./frontend/components/ExecutionTrace";
import { InspectorSidebar } from "./frontend/components/InspectorSidebar";
import { SettingsModal } from "./frontend/components/SettingsModal";
import { TreeExplorer } from "./frontend/components/TreeExplorer";
import { buildNodeDetails, findVisualRoot } from "./frontend/logic/dom";
import { resolveSourceRoot } from "./frontend/logic/source";
import { buildParsedSourceState, buildTraversalErrorState, executeTraversal, } from "./frontend/logic/traversal";
import { buildVisualLayout, buildVisualTree, } from "./frontend/logic/visualTree";
import type { Algorithm, ResultMode, SourceMode } from "./frontend/types";

function App() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("BFS");
  const [sourceMode, setSourceMode] = useState<SourceMode>("html");
  const [resultMode, setResultMode] = useState<ResultMode>("top");
  const [isConfigurationCollapsed, setIsConfigurationCollapsed] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInspectorVisible, setIsInspectorVisible] = useState(false);
  const [isTraversalAnimating, setIsTraversalAnimating] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [htmlInput, setHtmlInput] = useState("");
  const [selector, setSelector] = useState("");
  const [limitInput, setLimitInput] = useState("10");
  const [parsedRoot, setParsedRoot] = useState<ElmtNode | null>(null);
  const [settings, setSettings] = useState(createDefaultSettings);
  const [animatedVisitedPaths, setAnimatedVisitedPaths] = useState<string[]>([]);
  const [animatedMatchedPaths, setAnimatedMatchedPaths] = useState<string[]>([]);
  const [activeTraversalPath, setActiveTraversalPath] = useState<string | null>(null);
  const [flashingMatchedPaths, setFlashingMatchedPaths] = useState<string[]>([]);
  const [autoFitSignal, setAutoFitSignal] = useState(0);
  const [computedState, setComputedState] = useState(createEmptyComputedState);
  const traversalAnimationTimeoutsRef = useRef<number[]>([]);

  const {
    results,
    pathMetaMap,
    selectedPath,
    traceEntries,
    summary,
    statusText,
    visitedPaths,
    matchedPaths,
  } = computedState;

  const limitValue = Math.max(1, Number.parseInt(limitInput, 10) || 10);
  const visibleResults = resultMode === "top" ? results.slice(0, limitValue) : results;
  const visibleVisitedPaths = isTraversalAnimating ? animatedVisitedPaths : visitedPaths;
  const visibleMatchedPaths = isTraversalAnimating ? animatedMatchedPaths : matchedPaths;
  const visualStatusText = isTraversalAnimating ? `Animating ${algorithm} traversal...` : statusText;
  const visitedPathSet = useMemo(() => new Set(visibleVisitedPaths), [visibleVisitedPaths]);
  const matchedPathSet = useMemo(() => new Set(visibleMatchedPaths), [visibleMatchedPaths]);
  const flashingMatchedPathSet = useMemo(() => new Set(flashingMatchedPaths), [flashingMatchedPaths]);
  const desktopColumns = `${isConfigurationCollapsed ? "0rem" : "19rem"} minmax(0,1fr) ${isInspectorVisible ? INSPECTOR_PANEL_WIDTH : "0rem"}`;
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
  const selectedDetails = useMemo(() => {
    if (!selectedPath || !pathMetaMap) {
      return null;
    }

    const meta = pathMetaMap.get(selectedPath);
    return meta ? buildNodeDetails(meta) : null;
  }, [pathMetaMap, selectedPath]);

  function clearTraversalAnimationTimeouts() {
    for (const timeoutId of traversalAnimationTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }

    traversalAnimationTimeoutsRef.current = [];
  }

  function queueTraversalAnimation(callback: () => void, delay: number) {
    const timeoutId = window.setTimeout(callback, delay);
    traversalAnimationTimeoutsRef.current.push(timeoutId);
  }

  function syncTraversalAnimation(visitedSequence: string[], matchedSequence: string[]) {
    setAnimatedVisitedPaths(visitedSequence);
    setAnimatedMatchedPaths(matchedSequence);
    setActiveTraversalPath(null);
    setFlashingMatchedPaths([]);
    setIsTraversalAnimating(false);
  }

  function startTraversalAnimation(visitedSequence: string[], matchedSequence: string[], stepMs: number) {
    clearTraversalAnimationTimeouts();

    if (visitedSequence.length === 0) {
      syncTraversalAnimation(visitedSequence, matchedSequence);
      return;
    }

    const revealedVisitedPaths: string[] = [];
    const revealedMatchedPaths: string[] = [];
    const matchedPathLookup = new Set(matchedSequence);
    let stepIndex = 0;

    setAnimatedVisitedPaths([]);
    setAnimatedMatchedPaths([]);
    setActiveTraversalPath(null);
    setFlashingMatchedPaths([]);
    setIsTraversalAnimating(true);

    const animateStep = () => {
      const path = visitedSequence[stepIndex];
      revealedVisitedPaths.push(path);
      setAnimatedVisitedPaths([...revealedVisitedPaths]);
      setActiveTraversalPath(path);

      if (matchedPathLookup.has(path)) {
        revealedMatchedPaths.push(path);
        setAnimatedMatchedPaths([...revealedMatchedPaths]);
        setFlashingMatchedPaths((current) => [...current, path]);
        queueTraversalAnimation(() => {
          setFlashingMatchedPaths((current) => current.filter((item) => item !== path));
        }, TRAVERSAL_MATCH_FLASH_MS);
      }

      stepIndex += 1;

      if (stepIndex < visitedSequence.length) {
        queueTraversalAnimation(animateStep, stepMs);
        return;
      }

      queueTraversalAnimation(() => {
        syncTraversalAnimation(visitedSequence, matchedSequence);
      }, TRAVERSAL_MATCH_FLASH_MS);
    };

    animateStep();
  }

  function getStatus(path: string) {
    const canHighlightSelectedPath =
      !isTraversalAnimating || visitedPaths.length === 0 || visitedPathSet.has(path) || matchedPathSet.has(path);

    if (selectedPath === path && canHighlightSelectedPath) {
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

  useEffect(() => {
    return () => {
      clearTraversalAnimationTimeouts();
    };
  }, []);

  async function resolveCurrentSource(mode: SourceMode) {
    return resolveSourceRoot({mode, htmlInput, urlInput,});
  }

  async function parseCurrentSource(mode: SourceMode) {
    setIsBusy(true);
    try {
      const { root, label } = await resolveCurrentSource(mode);
      clearTraversalAnimationTimeouts();
      setParsedRoot(root);
      setComputedState(buildParsedSourceState(root, label));
      syncTraversalAnimation([], []);
      setIsInspectorVisible(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to parse the DOM.";
      clearTraversalAnimationTimeouts();
      setParsedRoot(null);
      setComputedState(buildTraversalErrorState(message));
      syncTraversalAnimation([], []);
      setIsInspectorVisible(false);
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
      if (settings.traversalAnimationEnabled) {
        startTraversalAnimation(nextState.visitedPaths, nextState.matchedPaths, settings.traversalAnimationStepMs);
      } else {
        clearTraversalAnimationTimeouts();
        syncTraversalAnimation(nextState.visitedPaths, nextState.matchedPaths);
      }
      if (settings.openInspectorAfterTraversal) {
        setIsInspectorVisible(true);
      }
      if (settings.openTraceAfterTraversal) {
        setIsTraceOpen(true);
      }
      if (settings.autoFitTreeAfterTraversal) {
        setAutoFitSignal((current) => current + 1);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run traversal.";
      clearTraversalAnimationTimeouts();
      setComputedState(buildTraversalErrorState(message));
      syncTraversalAnimation([], []);
      setIsInspectorVisible(false);
    } finally {
      setIsBusy(false);
    }
  }

  function resetForm() {
    clearTraversalAnimationTimeouts();
    setAlgorithm("BFS");
    setSourceMode("html");
    setResultMode("top");
    setUrlInput("");
    setHtmlInput("");
    setSelector("");
    setLimitInput("10");
    setParsedRoot(null);
    setComputedState(createEmptyComputedState());
    syncTraversalAnimation([], []);
    setIsInspectorVisible(false);
  }

  function selectPath(path: string) {
    setComputedState((current) => ({
      ...current,
      selectedPath: path,
    }));
    setIsInspectorVisible(true);
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
        <AppHeader
          isConfigurationCollapsed={isConfigurationCollapsed}
          onOpenAbout={() => setIsAboutOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleConfiguration={() => setIsConfigurationCollapsed((value) => !value)}
        />

        <div
          className="flex flex-1 flex-col xl:grid xl:overflow-hidden xl:transition-[grid-template-columns] xl:duration-300 xl:ease-out"
          style={{ gridTemplateColumns: desktopColumns }}
        >
          <ConfigurationPanel
            algorithm={algorithm}
            collapsed={isConfigurationCollapsed}
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
              activeTraversalPath={activeTraversalPath}
              autoFitSignal={autoFitSignal}
              flashingMatchedPathSet={flashingMatchedPathSet}
              getStatus={getStatus}
              isInspectorVisible={isInspectorVisible}
              layout={visualLayout}
              onBackgroundClick={() => setIsInspectorVisible(false)}
              onSelect={selectPath}
              statusText={visualStatusText}
            />
          </main>

          <InspectorSidebar
            algorithm={algorithm}
            onSelectPath={selectPath}
            selectedDetails={selectedDetails}
            selectedPath={selectedPath}
            summary={summary}
            visible={isInspectorVisible}
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
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onReset={() => setSettings(createDefaultSettings())}
        onSettingsChange={(next) => setSettings((current) => ({ ...current, ...next }))}
        settings={settings}
      />
    </div>
  );
}

export default App;
