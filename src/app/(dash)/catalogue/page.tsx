import { redirect } from "next/navigation";

/**
 * The catalogue is no longer a destination of its own: it lives at the top of the
 * Trainings tab, where the programmes and the register they describe are on the
 * same screen. This route stays only so old links and bookmarks land somewhere
 * useful instead of a 404.
 */
export default function CatalogueRedirect() {
  redirect("/trainings#catalogue");
}
