import { ResourceTiles, type ViewableResource } from "@/components/trainings/resource-viewer";

/**
 * The files under a training, as readable tiles.
 *
 * These used to be download links. A click on an attachment is nearly always
 * "show me", so the tile now opens the file in the reading overlay and the
 * download is its own button inside — see `resource-viewer.tsx`.
 */
export function ResourceChips({
  trainingId,
  trainingTitle,
  resources,
  canEdit = false,
}: {
  trainingId: string;
  trainingTitle?: string;
  resources: ViewableResource[];
  /** An editor can swap a wrong upload from inside the viewer. */
  canEdit?: boolean;
}) {
  return (
    <ResourceTiles
      trainingId={trainingId}
      trainingTitle={trainingTitle}
      resources={resources}
      layout="chip"
      canEdit={canEdit}
    />
  );
}
