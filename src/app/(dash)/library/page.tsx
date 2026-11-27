import { redirect } from "next/navigation";

/**
 * The flat material list used to live here; it is part of the library now.
 *
 * The header search still posts here, and so do bookmarks and older notice links,
 * so the route stays and forwards its query string to the library route rather
 * than 404ing. Nothing in the application links here any more.
 */
export default async function LibraryRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const key of ["q", "type", "page"] as const) {
    const value = params[key];
    if (typeof value === "string" && value.length > 0) search.set(key, value);
  }
  const suffix = search.toString();
  redirect(suffix ? `/catalogue?${suffix}` : "/catalogue");
}
