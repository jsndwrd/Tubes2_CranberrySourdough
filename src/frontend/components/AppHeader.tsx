type AppHeaderProps = {
  isConfigurationCollapsed: boolean;
  onOpenAbout: () => void;
  onOpenSettings: () => void;
  onToggleConfiguration: () => void;
};

export function AppHeader({ isConfigurationCollapsed, onOpenAbout, onOpenSettings, onToggleConfiguration }: AppHeaderProps) {
  const actionButtonClass = "rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-[rgba(248,249,250,0.94)] px-4 py-3 backdrop-blur md:px-5 xl:relative">
      <button
        aria-expanded={!isConfigurationCollapsed}
        aria-label={isConfigurationCollapsed ? "Show configuration panel" : "Hide configuration panel"}
        className="hidden h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white text-[var(--text-muted)] shadow-[0_12px_24px_-20px_rgba(15,23,42,0.32)] transition hover:border-[var(--primary)]/18 hover:bg-[var(--primary-soft)]/36 hover:text-[var(--primary)] xl:absolute xl:left-5 xl:top-1/2 xl:flex xl:-translate-y-1/2"
        onClick={onToggleConfiguration}
        type="button"
      >
        <span className="material-symbols-outlined text-[19px]">
          {isConfigurationCollapsed ? "left_panel_open" : "left_panel_close"}
        </span>
      </button>
      <div className="flex items-center xl:pl-14">
        <div>
          <p className="font-headline text-lg font-semibold tracking-tight text-[var(--text)] md:text-xl">
            Cranberry Sourdough
          </p>
          <p className="font-label text-xs font-medium text-[var(--text-muted)]">
            DOM Traversal Visualizer
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          aria-label="Open settings"
          className={actionButtonClass}
          onClick={onOpenSettings}
          title="Settings"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>
        <button
          aria-label="Open about dialog"
          className={actionButtonClass}
          onClick={onOpenAbout}
          title="About"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">info</span>
        </button>
      </div>
    </header>
  );
}
