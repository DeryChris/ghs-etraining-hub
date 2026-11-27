/**
 * The subject line of a complaint, cut from what the reporter wrote.
 *
 * The form asks one thing — "What happened?" — because asking for a summary of
 * the paragraph somebody is about to write is a second telling of the same story,
 * and the field that people leave half-filled. The desk still needs a short line
 * in its list, so the first sentence of the description becomes one: at most 140
 * characters, broken on a word, with an ellipsis when it was cut.
 *
 * Pure, so the rule can be tested without a database or a form.
 */
export const SUBJECT_LIMIT = 140;

export function summarise(description: string): string {
  const trimmed = description.replace(/\s+/g, " ").trim();
  if (!trimmed) return "Complaint";

  const first = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
  if (first.length <= SUBJECT_LIMIT) return first;

  const cut = first.slice(0, SUBJECT_LIMIT - 1);
  const space = cut.lastIndexOf(" ");
  // Only break on a space if it is not so early that the line loses its meaning.
  return `${(space > 60 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
