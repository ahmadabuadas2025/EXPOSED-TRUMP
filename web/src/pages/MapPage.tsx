import { MapExplorer } from "../components/MapExplorer";

export function MapPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-ink">The network map</h1>
      <p className="mb-4 mt-1 max-w-3xl text-sm text-ink2">
        People, companies, funds, governments and policy decisions, joined only where a cited finding connects them. Family ties are
        hidden by default to reduce clutter. Turn them on in the list of line types.
      </p>
      <MapExplorer height={760} />
    </div>
  );
}
