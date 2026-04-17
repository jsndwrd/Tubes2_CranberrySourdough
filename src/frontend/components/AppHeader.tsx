import { navigation } from "../constants";

type AppHeaderProps = {
  isBusy: boolean;
  onExecute: () => void;
};

export function AppHeader({ isBusy, onExecute }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-[rgba(248,249,250,0.94)] px-4 py-3 backdrop-blur md:px-5">
      <div className="flex items-center gap-4 md:gap-6">
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
        <div className="hidden items-center gap-2 rounded-xl border border-black/5 bg-[var(--surface-muted)] px-3 py-2 lg:flex">
          <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)]">
            search
          </span>
          <input
            className="w-48 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
            placeholder="Global node search..."
            type="text"
          />
        </div>
        <button
          className="rounded-xl bg-[var(--primary-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isBusy}
          onClick={onExecute}
          type="button"
        >
          {isBusy ? "Working..." : "Execute"}
        </button>
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
