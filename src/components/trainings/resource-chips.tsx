import { ResourceTiles, type ViewableResource } from "@/components/trainings/resource-viewer";

/**
 * The files under a training, as readable tiles.
 *
 * These used to be download links. A click on an attachment is nearly always
 * "show me", so the tile now opens the file in the reading overlay and the
 * download is its own button inside — see `resource-viewer.tsx`.
 */
export function ResourceChips({ trainingId, resources }: { trainingId: string; resources: ViewableResource[] }) {
  return <ResourceTiles trainingId={trainingId} resources={resources} layout="chip" />;
}
