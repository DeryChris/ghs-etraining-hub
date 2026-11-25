import "server-only";

/**
 * What this instance has actually done, in numbers.
 *
 * The health endpoint answers "is the database there?". It cannot answer "did
 * the pages I just clicked actually fail, or did they load and the screen lied?"
 * — and that is the question left when a tab appears to stall while every probe
 * comes back green. These counters ride along in the same payload, so one request
 * carries both halves of the story.
 *
 * Deliberately tiny and bounded: counts, and the last few loads only. Nothing
 * per-user, nothing identifying.
 */
export interface LoadRecord {
  label: string;
  ms: number;
  outcome: "ok" | "timeout" | "error";
}

interface State {
  ok: number;
  timeout: number;
  error: number;
  retried: number;
  recent: LoadRecord[];
}

const RECENT = 8;

const globalForStats = globalThis as unknown as { __ghsLoadStats?: State };

const state: State = (globalForStats.__ghsLoadStats ??= {
  ok: 0,
  timeout: 0,
  error: 0,
  retried: 0,
  recent: [],
});

export function recordLoad(record: LoadRecord): void {
  state[record.outcome] += 1;
  state.recent.unshift(record);
  if (state.recent.length > RECENT) state.recent.length = RECENT;
}

export function recordRetry(): void {
  state.retried += 1;
}

export function loadStats(): State {
  return { ...state, recent: [...state.recent] };
}
