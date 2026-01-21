import type { ExerciseMeta } from "@/constants/exercise";

export const RESULT_LIMIT = 20;
export const FETCH_LIMIT = 2000;

type ExerciseOption = ExerciseMeta & {
  aliases?: string[] | null;
  description?: string | null;
  effects?: string | null;
  effect?: string | null;
};

export const looksLikeMissingColumn = (error: unknown, column: string) => {
  if (!error || typeof error !== "object") return false;
  const msg = (error as { message?: unknown }).message;
  if (typeof msg !== "string") return false;
  return msg.toLowerCase().includes(column.toLowerCase()) && msg.toLowerCase().includes("does not exist");
};

export const normalizeOption = (row: ExerciseOption): ExerciseOption => {
  if (row.effects == null && row.effect != null) {
    return { ...row, effects: row.effect };
  }
  return row;
};

export const normalizeSearch = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()[\]{}.,/\\-]/g, "");

export const filterExercises = (candidates: ExerciseOption[], query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return candidates.slice(0, RESULT_LIMIT);

  const normalized = normalizeSearch(trimmed);

  const filtered = candidates.filter((exercise) => {
    const name = exercise.name ?? "";
    const aliases = exercise.aliases ?? [];
    const haystack = [name, ...aliases].filter(Boolean);

    return haystack.some((text) => {
      const t = String(text);
      if (t.includes(trimmed)) return true;
      if (t.toLowerCase().includes(trimmed.toLowerCase())) return true;
      return normalizeSearch(t).includes(normalized);
    });
  });

  return filtered.slice(0, 50);
};

export type { ExerciseOption };
