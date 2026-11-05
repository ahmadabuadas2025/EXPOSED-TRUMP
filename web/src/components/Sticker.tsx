import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type StickerName =
  | "receipt" | "lens" | "coin"
  | "map" | "evidence" | "timeline" | "profiles" | "money" | "sources" | "method" | "data";

/** Decorative art, so it is hidden from screen readers. Keep it out of findings and away from named people. */
export function Sticker({ name, size, className = "", eager = false }: { name: StickerName; size: number; className?: string; eager?: boolean }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}stickers/${name}.webp`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`select-none object-contain ${className}`}
    />
  );
}

export function PageTitle({ sticker, children }: { sticker: StickerName; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Sticker name={sticker} size={52} eager className="anim-pop h-11 w-11 shrink-0 sm:h-[52px] sm:w-[52px]" />
      <h1 className="font-serif text-3xl font-semibold text-ink">{children}</h1>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="card flex items-center gap-4 p-5 text-ink2">
      <Sticker name="lens" size={72} className="anim-sway shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function NotFound() {
  return (
    <EmptyState>
      <p className="font-medium text-ink">This page doesn't exist.</p>
      <Link to="/" className="link mt-1 inline-block text-sm">Go to the homepage</Link>
    </EmptyState>
  );
}
