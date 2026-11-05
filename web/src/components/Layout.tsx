import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useData } from "../lib/data";
import { globalSearch } from "../lib/filters";
import { DonateWidget } from "./DonateWidget";
import { PageBoundary } from "./PageBoundary";

const NAV = [
  ["/map", "Map"],
  ["/evidence", "Evidence"],
  ["/timeline", "Timeline"],
  ["/profiles", "Profiles"],
  ["/money", "Money"],
  ["/sources", "Sources"],
  ["/method", "Method"],
  ["/data", "Data"],
];

function GlobalSearch() {
  const { bundle } = useData();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const hits = globalSearch(bundle, q);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    nav(href);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative w-full sm:w-72">
      <label htmlFor="gsearch" className="sr-only">Search people, organisations, policies, transactions and sources</label>
      <input
        id="gsearch"
        ref={input}
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls="gsearch-list"
        aria-activedescendant={hits[i] ? `gs-${i}` : undefined}
        className="input py-1.5"
        placeholder="Search everything  ( / )"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setI(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, hits.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
          if (e.key === "Enter" && hits[i]) go(hits[i].href);
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && hits.length > 0 && (
        <ul id="gsearch-list" role="listbox" className="absolute right-0 z-50 mt-1 max-h-96 w-full min-w-[320px] overflow-auto rounded-md border border-line bg-raised shadow-lg">
          {hits.map((h, n) => (
            <li key={h.kind + h.id} id={`gs-${n}`} role="option" aria-selected={n === i}>
              <button type="button" onMouseDown={() => go(h.href)}
                className={`block w-full px-3 py-2 text-left ${n === i ? "bg-surface" : ""}`}>
                <span className="font-mono text-[10px] uppercase text-muted">{h.kind}</span>
                <span className="block text-sm text-ink">{h.label}</span>
                <span className="block truncate text-xs text-ink2">{h.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Layout() {
  const { bundle } = useData();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => {
    if (!loc.search.includes("claim=") && !loc.search.includes("tx=")) window.scrollTo(0, 0);
  }, [loc.pathname, loc.search]);

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-page">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-page/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="flex items-baseline gap-1 font-sans text-lg font-bold tracking-tight text-ink">
            EXPOSED<span className="text-[color:var(--k-money)]">—</span>TRUMP
          </Link>
          <button type="button" className="btn ml-auto px-2 lg:hidden" aria-expanded={menu} aria-controls="mainnav" onClick={() => setMenu(!menu)}>
            ☰ <span className="sr-only">Menu</span>
          </button>
          <nav id="mainnav" aria-label="Main" className={`${menu ? "flex" : "hidden"} w-full flex-col gap-1 lg:flex lg:w-auto lg:flex-row lg:gap-4`}>
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => `py-1 text-sm ${isActive ? "font-semibold text-ink underline decoration-popPink decoration-2 underline-offset-8" : "text-ink2 hover:text-ink"}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex w-full items-center gap-2 sm:w-auto lg:ml-auto">
            <GlobalSearch />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1500px] px-4 py-6">
        <PageBoundary key={loc.pathname}>
          <Outlet />
        </PageBoundary>
      </main>
      <footer className="mt-16 border-t border-line">
        <div className="mx-auto grid max-w-[1500px] gap-6 px-4 pb-20 pt-8 text-xs text-ink2 md:grid-cols-3">
          <p>
            <strong className="text-ink">An independent evidence project.</strong> Being on this map is not an accusation. Each finding
            is labelled by how well it is established, and denials and limitations sit next to the claims they answer.
          </p>
          <p>
            {bundle.stats.claims} findings · {bundle.stats.sources} sources ({bundle.stats.reviewed_sources} read in full) · data built{" "}
            {bundle.generated}. Corrections: open an issue with the source that contradicts us.
          </p>
          <p>
            Not affiliated with any campaign, government or the reference site whofundedgenocide.com. Code MIT; data CC BY 4.0 —{" "}
            <Link to="/data" className="link">download it</Link>.
          </p>
        </div>
      </footer>
      <DonateWidget />
    </div>
  );
}
