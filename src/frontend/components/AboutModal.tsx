import { useEffect, useState } from "react";

type AboutTab = "about" | "authors" | "guide" | "algorithms";

type AboutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type AboutTabItem = {
  id: AboutTab;
  label: string;
  icon: string;
};

type AuthorLink = {
  label: string;
  href: string;
};

type AuthorCard = {
  name: string;
  nim: string;
  links: AuthorLink[];
};

const aboutTabs: AboutTabItem[] = [
  { id: "about", label: "About", icon: "info" },
  { id: "authors", label: "Authors", icon: "group" },
  { id: "guide", label: "How to Use", icon: "school" },
  { id: "algorithms", label: "BFS vs DFS", icon: "account_tree" }
];

const authors: AuthorCard[] = [
  {
    name: "Muhammad Nur Majiid",
    nim: "13524028",
    links: [{ label: "GitHub", href: "https://github.com/MAJIIDMN" }]
  },
  {
    name: "Jason Edward Salim",
    nim: "13524034",
    links: [
      { label: "Portfolio", href: "https://www.jasonedward.dev" },
      { label: "GitHub", href: "https://github.com/jsndwrd" }
    ]
  },
  {
    name: "Bryan Pratama Putra Hendra",
    nim: "13524067",
    links: [{ label: "GitHub", href: "https://github.com/BryannPPH" }]
  }
];

function InfoCard({ title, text, icon }: { title: string; text: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-[var(--surface-low)] p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
        <span className="material-symbols-outlined text-[19px]">{icon}</span>
      </div>
      <h4 className="text-sm font-semibold text-[var(--text)]">{title}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{text}</p>
    </div>
  );
}

function AuthorProfile({ name, nim, links }: AuthorCard) {
  return (
    <div className="rounded-2xl border border-black/5 bg-[var(--surface-low)] p-4">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-sm font-semibold text-[var(--text)]">
        {name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
      </div>
      <h4 className="text-base font-semibold text-[var(--text)]">{name}</h4>
      <p className="mt-1 text-sm text-[var(--text-muted)]">NIM {nim}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={`${name}-${link.label}`}
            className="rounded-full border border-[var(--primary)]/18 bg-white px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition hover:border-[var(--primary)]/28 hover:bg-[var(--primary-soft)]/36"
            href={link.href}
            rel="noreferrer"
            target="_blank"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function AboutContent() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-black/5 bg-[linear-gradient(180deg,rgba(217,226,255,0.7)_0%,rgba(255,255,255,0.95)_100%)] p-5">
        <div className="max-w-3xl space-y-3">
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--primary)] shadow-[0_10px_24px_-20px_rgba(0,69,163,0.55)]">
            IF2211 Algorithm Strategy 2nd Project
          </span>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Cranberry Sourdough visualizes DOM traversal with a clearer, inspectable workflow.
          </h3>
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            This interface helps you load a document, run BFS or DFS over the DOM tree, inspect matches for a CSS selector, and understand the traversal trace without switching context between raw output and structure.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon="language"
          text="Load a live page from URL or paste raw HTML directly when you want a faster controlled test case."
          title="Flexible Input"
        />
        <InfoCard
          icon="travel_explore"
          text="Run BFS or DFS against the parsed DOM, then inspect visited nodes, matches, depth, and execution trace."
          title="Traversal Focus"
        />
        <InfoCard
          icon="hub"
          text="Click tree nodes or matched results to inspect DOM path, hierarchy details, and traversal context."
          title="Node Inspection"
        />
      </section>
    </div>
  );
}

function AuthorsContent() {
  return (
    <div className="space-y-5">
      <div className="max-w-2xl">
        <h3 className="text-xl font-semibold text-[var(--text)]">Project Authors</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
          Team members listed here are taken directly from the repository metadata in `README.md`.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {authors.map((author) => (
          <AuthorProfile
            key={author.nim}
            links={author.links}
            name={author.name}
            nim={author.nim}
          />
        ))}
      </div>
    </div>
  );
}

function GuideContent() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoCard
        icon="upload_file"
        text="Choose `URL Source` when you want to scrape a page, or `Raw HTML` when you want to control the markup yourself."
        title="1. Load the DOM"
      />
      <InfoCard
        icon="tune"
        text="Pick `BFS` or `DFS`, then enter a supported CSS selector. `Top N` limits the visible results, while `All` shows everything."
        title="2. Configure Traversal"
      />
      <InfoCard
        icon="play_circle"
        text="Run traversal to populate the visual tree, matched results, execution trace, and the inspector sidebar."
        title="3. Execute"
      />
      <InfoCard
        icon="ads_click"
        text="Click any node to open the inspector. Click empty tree space when you want to hide the right inspector again."
        title="4. Inspect Interactively"
      />
    </div>
  );
}

function AlgorithmsContent() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-[var(--surface-low)] p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <span className="material-symbols-outlined text-[20px]">dns</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)]">Breadth-First Search</h3>
              <p className="text-sm text-[var(--text-muted)]">Explores level by level from the root.</p>
            </div>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-[var(--text-muted)]">
            <p>BFS visits nodes in order of depth, which makes it easier to find the earliest shallow match in the DOM tree.</p>
            <p>It is useful when you care about broad structure first, such as locating higher-level containers before going deeper.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-[var(--surface-low)] p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <span className="material-symbols-outlined text-[20px]">account_tree</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)]">Depth-First Search</h3>
              <p className="text-sm text-[var(--text-muted)]">Explores one branch deeply before backtracking.</p>
            </div>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-[var(--text-muted)]">
            <p>DFS dives through descendants first, which can surface deeply nested matches earlier in a single branch.</p>
            <p>It is useful when you want to follow structural nesting closely or compare branch behavior in detail.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon="vertical_align_top"
          text="BFS is usually easier to read when you want shallow matches or level-by-level trace output."
          title="When BFS Fits"
        />
        <InfoCard
          icon="south"
          text="DFS is helpful when your target is likely nested deep and you want branch-focused traversal order."
          title="When DFS Fits"
        />
        <InfoCard
          icon="rule"
          text="Both algorithms use the same selector logic here. The difference is the visitation order, not matching criteria."
          title="What Stays the Same"
        />
      </div>
    </div>
  );
}

function ModalBody({ activeTab }: { activeTab: AboutTab }) {
  if (activeTab === "authors") {
    return <AuthorsContent />;
  }

  if (activeTab === "guide") {
    return <GuideContent />;
  }

  if (activeTab === "algorithms") {
    return <AlgorithmsContent />;
  }

  return <AboutContent />;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [activeTab, setActiveTab] = useState<AboutTab>("about");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab("about");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/28 px-4 py-6 backdrop-blur-[6px] md:px-6"
      onClick={onClose}
    >
      <div
        aria-modal="true"
        className="ambient-shadow flex max-h-[min(44rem,calc(100vh-3rem))] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-black/5 bg-[var(--surface-panel)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4 md:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center">
              <img
                alt="Cranberry Sourdough logo"
                className="h-full w-full object-contain"
                src="/favicon.png?v=2"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">About This Web</p>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Cranberry Sourdough</h2>
              <p className="text-sm text-[var(--text-muted)]">DOM traversal visualizer</p>
            </div>
          </div>
          <button
            aria-label="Close about dialog"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-white text-[var(--text-muted)] transition hover:border-[var(--primary)]/18 hover:bg-[var(--primary-soft)]/36 hover:text-[var(--primary)]"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="border-b border-black/5 px-5 py-3 md:px-6">
          <div className="flex flex-wrap gap-2">
            {aboutTabs.map((tab) => (
              <button
                key={tab.id}
                className={[
                  "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
                  activeTab === tab.id
                    ? "border-[var(--primary)]/30 bg-[linear-gradient(180deg,rgba(217,226,255,0.92)_0%,rgba(255,255,255,0.98)_100%)] text-[var(--primary)] shadow-[0_18px_30px_-22px_rgba(0,69,163,0.72)] ring-1 ring-[var(--primary)]/14"
                    : "border-black/5 bg-white text-[var(--text-muted)] hover:border-[var(--primary)]/16 hover:bg-[var(--primary-soft)]/34 hover:text-[var(--primary)]"
                ].join(" ")}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5 md:px-6 md:py-6">
          <ModalBody activeTab={activeTab} />
        </div>
      </div>
    </div>
  );
}
