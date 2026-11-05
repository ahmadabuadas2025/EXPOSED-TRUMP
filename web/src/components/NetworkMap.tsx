import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { useEffect, useRef } from "react";
import { moneyRange } from "../lib/format";
import type { Edge, Entity } from "../lib/types";
import { EDGE, LANES } from "../lib/vocab";

export type Selection = { kind: "entity" | "edge"; id: string } | null;
export type LayoutName = "lanes" | "force" | "ego";

// Plain polygons only: cytoscape 3.30's rounded polygons ("round-diamond", "round-tag", …)
// throw when an animated layout briefly stacks two nodes on the same point.
const SHAPE: Record<string, cytoscape.Css.NodeShape> = {
  person: "ellipse",
  company: "round-rectangle",
  fund: "diamond",
  government: "octagon",
  agency: "barrel",
  legislature: "barrel",
  nonprofit: "pentagon",
  pac: "pentagon",
  policy: "tag",
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * Lanes: one column per lane, ordered by connectedness so hubs sit mid-column.
 * Long lanes wrap into two sub-columns so the board stays wide rather than tall.
 */
function lanePositions(entities: Entity[]) {
  const byLane = new Map<number, Entity[]>();
  for (const e of entities) byLane.set(e.lane, [...(byLane.get(e.lane) ?? []), e]);
  const pos: Record<string, { x: number; y: number }> = {};
  const colW = 225;
  const rowH = 78;
  for (const [lane, list] of byLane) {
    const sorted = [...list].sort((a, b) => b.degree - a.degree);
    const ordered: Entity[] = [];
    sorted.forEach((e, i) => (i % 2 ? ordered.push(e) : ordered.unshift(e)));
    const cx = (lane - 1) * colW;
    if (ordered.length > 6) {
      const rows = Math.ceil(ordered.length / 2);
      const top = -((rows - 1) * rowH) / 2;
      ordered.forEach((e, i) => (pos[e.id] = { x: cx + (i % 2 ? 62 : -62), y: top + Math.floor(i / 2) * rowH + (i % 2 ? rowH / 2 : 0) }));
    } else {
      const top = -((ordered.length - 1) * rowH * 1.3) / 2;
      ordered.forEach((e, i) => (pos[e.id] = { x: cx, y: top + i * rowH * 1.3 }));
    }
  }
  const minY = Math.min(0, ...Object.values(pos).map((p) => p.y));
  const headers = [...byLane.keys()].map((lane) => ({ lane, x: (lane - 1) * colW, y: minY - 60 }));
  return { pos, headers };
}

/** Point at t along an edge as drawn: straight, or the quadratic bezier cytoscape uses for parallel edges. */
function pointOnEdge(e: cytoscape.EdgeSingular, t: number) {
  const s = e.sourceEndpoint();
  const d = e.targetEndpoint();
  const cps = e.controlPoints();
  if (!cps || cps.length === 0) return { x: s.x + (d.x - s.x) * t, y: s.y + (d.y - s.y) * t };
  const c = cps[0];
  const u = 1 - t;
  return { x: u * u * s.x + 2 * u * t * c.x + t * t * d.x, y: u * u * s.y + 2 * u * t * c.y + t * t * d.y };
}

export function NetworkMap({
  entities,
  edges,
  selected,
  onSelect,
  layout = "lanes",
  height = 640,
  focus,
  showAmounts = true,
  wheelZoom = true,
}: {
  entities: Entity[];
  edges: Edge[];
  selected: Selection;
  onSelect: (s: Selection) => void;
  layout?: LayoutName;
  height?: number | string;
  focus?: string;
  showAmounts?: boolean;
  /** When false, plain wheel scrolling passes through to the page and only Ctrl + wheel zooms. */
  wheelZoom?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  // The entrance plays once. Filter changes rebuild the graph and should simply update it.
  const entrancePlayed = useRef(false);
  const fx = useRef<HTMLCanvasElement>(null);
  const cy = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  // The sticky highlight (selection or a profile's focus) that hover returns to.
  const sticky = useRef<{ id?: string; labelEdges: boolean }>({ labelEdges: false });

  useEffect(() => {
    if (!ref.current) return;
    const motion = !reducedMotion();
    const entrance = motion && !entrancePlayed.current;
    const visible = new Set(edges.flatMap((e) => [e.source, e.target]));
    if (focus) visible.add(focus);
    const nodes = entities.filter((e) => visible.has(e.id));
    const { pos, headers } = lanePositions(nodes);
    const els: ElementDefinition[] = [
      ...(layout === "lanes"
        ? headers.map((h) => ({
            group: "nodes" as const,
            data: { id: `lane-${h.lane}`, label: LANES[h.lane - 1] },
            position: { x: h.x, y: h.y },
            classes: "lane",
            selectable: false,
            grabbable: false,
          }))
        : []),
      ...nodes.map((e) => ({
        group: "nodes" as const,
        data: { id: e.id, label: e.name, type: e.type, lane: e.lane, size: 14 + Math.min(e.degree, 24) * 1.6 },
        position: pos[e.id],
        classes: entrance ? "boot" : "",
      })),
      ...edges.map((e) => {
        const amount = e.amount_high !== undefined ? moneyRange(e.amount_low!, e.amount_high, e.currency!) : undefined;
        return {
          group: "edges" as const,
          data: {
            id: e.id, source: e.source, target: e.target, kind: e.kind, label: e.label,
            ...(amount ? { amount, full: `${amount} · ${e.label}` } : { full: e.label }),
          },
          classes: entrance ? "boot" : "",
        };
      }),
    ];

    const ink = cssVar("--map-label");
    const bg = cssVar("--map-label-bg");
    const gold = cssVar("--k-money");
    const fade = { "transition-property": "opacity, text-opacity, underlay-opacity, width, border-width", "transition-duration": 350 };
    const edgeStyles = Object.entries(EDGE).map(([kind, s]) => ({
      selector: `edge[kind = "${kind}"]`,
      style: {
        "line-color": cssVar(s.color),
        "target-arrow-color": cssVar(s.color),
        "line-style": s.style,
        "line-dash-pattern": s.style === "dotted" ? [1.5, 4] : [7, 5],
        width: kind === "money" ? 3 : kind === "family" ? 1.2 : 2,
        "underlay-color": cssVar(s.color),
      } as cytoscape.Css.Edge,
    }));

    const instance = cytoscape({
      container: ref.current,
      elements: els,
      minZoom: 0.15,
      maxZoom: 3,
      style: [
        {
          selector: "node",
          style: {
            shape: (n: cytoscape.NodeSingular) => SHAPE[n.data("type")] ?? "ellipse",
            width: "data(size)",
            height: "data(size)",
            "background-color": ink,
            "background-opacity": 0.9,
            "border-width": 2,
            "border-color": bg,
            label: "data(label)",
            color: ink,
            "font-family": "Public Sans Variable, system-ui, sans-serif",
            "font-size": 14,
            "font-weight": 500,
            "text-valign": "bottom",
            "text-margin-y": 4,
            "text-wrap": "wrap",
            "text-max-width": "118px",
            "text-background-color": bg,
            "text-background-opacity": 0.85,
            "text-background-padding": "2px",
            "underlay-color": gold,
            "underlay-opacity": 0,
            "underlay-padding": 10,
            "underlay-shape": "ellipse",
            ...fade,
          } as cytoscape.Css.Node,
        },
        { selector: 'node[type = "policy"]', style: { "background-color": cssVar("--k-policy") } },
        {
          selector: "node.lane",
          style: {
            width: 1, height: 1, "background-opacity": 0, "border-width": 0, events: "no",
            "font-size": 14, "font-weight": 600,
            color: cssVar("--k-family"), "text-valign": "center", "text-max-width": "190px", "text-wrap": "wrap", "text-background-opacity": 0,
          } as cytoscape.Css.Node,
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.8,
            opacity: 0.75,
            label: "",
            "font-size": 10,
            "font-weight": 600,
            color: ink,
            "text-background-color": bg,
            "text-background-opacity": 0.92,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
            "text-rotation": "autorotate",
            "underlay-opacity": 0,
            "underlay-padding": 3,
            ...fade,
          } as cytoscape.Css.Edge,
        },
        ...edgeStyles,
        // Money edges carry their amount; text stays in ink, the line carries the colour.
        ...(showAmounts ? [{ selector: "edge[amount]", style: { label: "data(amount)", opacity: 0.9, "font-size": 12 } as cytoscape.Css.Edge }] : []),
        { selector: "edge.labelled", style: { label: "data(full)", "z-index": 10 } as cytoscape.Css.Edge },
        // Lights off: everything outside the highlighted neighbourhood recedes.
        { selector: ".dim", style: { opacity: 0.06, "text-opacity": 0 } },
        { selector: "node.lit", style: { "underlay-opacity": 0.18, opacity: 1 } as cytoscape.Css.Node },
        { selector: "node.core", style: { "underlay-opacity": 0.4, "underlay-padding": 14, "border-color": gold, "border-width": 3 } as cytoscape.Css.Node },
        { selector: "edge.lit", style: { opacity: 1, "underlay-opacity": 0.22, "z-index": 9 } as cytoscape.Css.Edge },
        { selector: 'edge.lit[kind = "money"]', style: { width: 4.5 } },
        { selector: ".boot", style: { opacity: 0, "text-opacity": 0 } },
      ],
      layout:
        layout === "lanes"
          ? { name: "preset", fit: true, padding: 48 }
          : layout === "ego"
            ? ({
                name: "concentric", fit: true, padding: 40, minNodeSpacing: 70, avoidOverlap: true,
                animate: motion, animationDuration: 700, animationEasing: "ease-out-cubic",
                concentric: (n: cytoscape.NodeSingular) => (n.id() === focus ? 2 : 1), levelWidth: () => 1,
              } as cytoscape.LayoutOptions)
            : ({
                name: "cose", randomize: true, animate: motion ? "end" : false, animationDuration: 900,
                animationEasing: "ease-out-cubic", nodeRepulsion: () => 90000, idealEdgeLength: () => 80,
                edgeElasticity: () => 100, gravity: 1.2, numIter: 2500, nodeOverlap: 40, componentSpacing: 120, padding: 30,
              } as cytoscape.LayoutOptions),
    });

    // ── highlight: one function for hover (transient) and selection (sticky) ──
    const dimBg = (on: boolean) => {
      if (ref.current) ref.current.style.background = on ? "var(--map-bg-dim)" : "var(--map-bg)";
    };
    const clear = () => {
      instance.elements().removeClass("dim lit core labelled");
      dimBg(false);
    };
    const light = (el: cytoscape.SingularElementReturnValue | undefined, labelEdges: boolean) => {
      clear();
      if (!el || el.empty()) return;
      const hood = el.isNode()
        ? el.closedNeighborhood()
        : (el as unknown as cytoscape.EdgeSingular).union((el as unknown as cytoscape.EdgeSingular).connectedNodes());
      instance.elements().not(hood).not(".lane").addClass("dim");
      hood.addClass("lit");
      el.addClass("core");
      if (el.isEdge()) el.addClass("labelled");
      else if (labelEdges) (el as unknown as cytoscape.NodeSingular).connectedEdges().addClass("labelled");
      dimBg(true);
    };
    const restore = () => {
      const s = sticky.current;
      light(s.id ? instance.getElementById(s.id) : undefined, s.labelEdges);
    };
    instance.scratch("_restore", restore);

    instance.on("tap", "node", (e) => onSelectRef.current({ kind: "entity", id: e.target.id() }));
    instance.on("tap", "edge", (e) => onSelectRef.current({ kind: "edge", id: e.target.id() }));
    instance.on("tap", (e) => e.target === instance && onSelectRef.current(null));
    instance.on("mouseover", "node", (e) => !e.target.hasClass("lane") && light(e.target, false));
    instance.on("mouseover", "edge", (e) => light(e.target, false));
    instance.on("mouseout", "node, edge", restore);

    // "fit" over-zooms small graphs; cap it so labels stay in proportion. For the clustered
    // layout, long chains can shrink the fit until text is unreadable, so open at a readable
    // zoom centred on the most connected node instead (the ⤢ button still shows everything).
    // Phones get the same treatment, because five columns can't fit a narrow screen legibly.
    const clamp = () => {
      const tooSmall = instance.zoom() < 0.75 && (layout === "force" || (layout === "lanes" && instance.width() < 640));
      if (instance.zoom() > 1.1) {
        instance.zoom(1.1);
        instance.center();
      } else if (tooSmall) {
        const hub = instance.nodes().max((n) => n.degree(false)).ele;
        instance.zoom(0.75);
        instance.center(hub);
      }
    };
    instance.one("layoutstop", clamp);
    clamp();

    // Canvas text doesn't repaint by itself when the web font arrives.
    document.fonts?.ready.then(() => {
      if (!instance.destroyed()) instance.forceRender();
    });

    // Entrance: columns light up left to right, the way the money travels; then the lines.
    const timers: number[] = [];
    if (entrance) {
      const lanes = [...new Set(instance.nodes().map((n) => n.data("lane") as number))].sort();
      lanes.forEach((lane, i) =>
        timers.push(window.setTimeout(() => instance.nodes(`[lane = ${lane}]`).removeClass("boot"), 80 + i * 110)),
      );
      timers.push(window.setTimeout(() => instance.edges().removeClass("boot"), 80 + lanes.length * 110 + 120));
      timers.push(
        window.setTimeout(() => {
          entrancePlayed.current = true;
          restore();
        }, 80 + lanes.length * 110 + 500),
      );
    } else {
      restore();
    }

    // ── money flow: particles travel along money lines, source → target ──
    // Solid dots for money the record says moved; hollow rings for commitments and estimates,
    // so the animation keeps the paid / promised distinction the line styles make.
    // Drawn at about 30 fps, and only while the map is on screen.
    let raf = 0;
    let lastFrame = 0;
    let onScreen = true;
    let observer: IntersectionObserver | undefined;
    const canvas = fx.current;
    const ctx = canvas?.getContext("2d");
    if (motion && canvas && ctx) {
      const t0 = performance.now();
      const flowing = instance.edges('[kind = "money"], [kind = "money-proposed"]');
      const draw = (now: number) => {
        if (!onScreen) {
          raf = 0;
          return;
        }
        raf = requestAnimationFrame(draw);
        if (now - lastFrame < 32) return;
        lastFrame = now;
        const dpr = window.devicePixelRatio || 1;
        const w = instance.width();
        const h = instance.height();
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const zoom = instance.zoom();
        const pan = instance.pan();
        const anyLit = instance.edges(".lit").nonempty();
        flowing.forEach((e) => {
          if (e.hasClass("boot") || e.hasClass("dim")) return;
          const lit = e.hasClass("lit");
          if (anyLit && !lit) return;
          const proposed = e.data("kind") === "money-proposed";
          const n = lit ? 3 : 2;
          const speed = lit ? 0.42 : 0.18; // fraction of the edge per second
          for (let k = 0; k < n; k++) {
            const t = (((now - t0) / 1000) * speed + k / n) % 1;
            const p = pointOnEdge(e, t);
            const x = p.x * zoom + pan.x;
            const y = p.y * zoom + pan.y;
            const r = (lit ? 3.6 : 2.4) * Math.max(0.7, Math.min(zoom, 1.4));
            ctx.globalAlpha = lit ? 0.95 : 0.55;
            ctx.shadowColor = gold;
            ctx.shadowBlur = lit ? 10 : 0;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            if (proposed) {
              ctx.lineWidth = 1.6;
              ctx.strokeStyle = gold;
              ctx.stroke();
            } else {
              ctx.fillStyle = gold;
              ctx.fill();
            }
          }
        });
      };
      observer = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen && !raf) raf = requestAnimationFrame(draw);
      });
      observer.observe(canvas);
    }

    cy.current = instance;
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
      instance.destroy();
    };
  }, [entities, edges, layout, focus, showAmounts]);

  // Hide plain wheel events from cytoscape (it listens on its own container) so the page scrolls.
  useEffect(() => {
    const el = wrap.current;
    if (wheelZoom || !el) return;
    const passThrough = (e: WheelEvent) => {
      if (!e.ctrlKey) e.stopPropagation();
    };
    el.addEventListener("wheel", passThrough, { capture: true, passive: true });
    return () => el.removeEventListener("wheel", passThrough, { capture: true });
  }, [wheelZoom]);

  // Sticky highlight follows the selection without rebuilding the graph.
  useEffect(() => {
    const id = selected?.id ?? focus;
    // A node's lines show amounts only; full descriptions appear when a single line is picked.
    sticky.current = { id, labelEdges: false };
    const restore = cy.current?.scratch("_restore") as (() => void) | undefined;
    restore?.();
  }, [selected, focus, entities, edges, layout, showAmounts]);

  return (
    <div ref={wrap} className="relative">
      <div
        ref={ref}
        style={{ height, background: "var(--map-bg)", transition: "background-color 0.35s ease" }}
        className="w-full rounded-lg border border-line"
        role="img"
        aria-label="Network map of people, organisations and policies. Use the text table view for a text version."
      />
      <canvas ref={fx} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full rounded-lg" style={{ height }} />
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {[
          ["+", "Zoom in", () => cy.current?.animate({ zoom: { level: cy.current.zoom() * 1.3, renderedPosition: center(cy.current) } }, { duration: 200 })],
          ["−", "Zoom out", () => cy.current?.animate({ zoom: { level: cy.current.zoom() / 1.3, renderedPosition: center(cy.current) } }, { duration: 200 })],
          ["⤢", "Fit everything", () => cy.current?.animate({ fit: { eles: cy.current.elements(), padding: 48 } }, { duration: 300 })],
        ].map(([t, label, fn]) => (
          <button key={label as string} type="button" aria-label={label as string} title={label as string}
            onClick={fn as () => void}
            className="grid h-8 w-8 place-items-center rounded-md border border-line bg-raised text-ink hover:border-ink2">
            {t as string}
          </button>
        ))}
      </div>
    </div>
  );
}

function center(c: Core) {
  return { x: c.width() / 2, y: c.height() / 2 };
}
