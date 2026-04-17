import { navigation } from "../constants";

type AppHeaderProps = {
  isConfigurationCollapsed: boolean;
  onToggleConfiguration: () => void;
};

export function AppHeader({ isConfigurationCollapsed, onToggleConfiguration }: AppHeaderProps) {
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
      <div className="flex items-center gap-4 md:gap-6 xl:pl-14">
        <div>
          <p className="font-headline text-lg font-semibold tracking-tight text-[var(--text)] md:text-xl">
            Cranberry Sourdough
          </p>
          <p className="font-label text-xs font-medium text-[var(--text-muted)]">
            DOM Traversal Visualizer
          </p>
        </div>
        <nav className="hidden items-center gap-4 md:flex">
          {navigation.map((item, index) => (
            <a
              key={item}
              className={[
                "border-b-2 border-transparent pb-1 text-sm font-medium transition-colors",
                index === 0
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--primary)]"
              ].join(" ")}
              href="#"
            >
              {item}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <button
            className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </button>
          <button
            className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
          </button>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-strong)] text-sm font-semibold text-[var(--text)]">
          BP
        </div>
      </div>
    </header>
  );
}
