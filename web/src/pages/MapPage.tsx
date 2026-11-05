import { MapExplorer } from "../components/MapExplorer";
import { PageTitle } from "../components/Sticker";

export function MapPage() {
  return (
    <div>
      <PageTitle sticker="map">The network map</PageTitle>
      <p className="mb-4 mt-1 max-w-3xl text-sm text-ink2">
        People, companies, funds, governments and policy decisions, joined only where a cited finding connects them. Family ties are
        hidden by default to reduce clutter. Turn them on in the list of line types.
      </p>
      <MapExplorer height={760} />
    </div>
  );
}
