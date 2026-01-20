import type { ExerciseMeta } from "@/constants/exercise";
import type { ProgramExerciseForm } from "@/lib/validation";

type ErrorWithMessage = { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };

type ProgramExercisePayload = {
  program_id: string;
  exercise_id: string;
  order: number;
  target_sets: number;
  target_weight: number | null;
  target_reps: number | null;
  target_time: number | null;
  rest_seconds: number | null;
};

export const createEmptyExercise = (): ProgramExerciseForm => ({
  id: String(Date.now() + Math.random()),
  exerciseId: "",
  exerciseName: "",
  recordType: "",
  targetPart: "",
  targetSets: "",
  restSeconds: "",
  targetWeight: "",
  targetReps: "",
  targetTime: "",
});

export const toExerciseMeta = (exercise: ProgramExerciseForm): ExerciseMeta | null => {
  if (!exercise.exerciseId || !exercise.recordType || !exercise.targetPart) return null;
  return {
    id: exercise.exerciseId,
    name: exercise.exerciseName,
    record_type: exercise.recordType,
    target_part: exercise.targetPart,
  };
};

export const numberOrNull = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const isExerciseComplete = (exercise: ProgramExerciseForm) => {
  if (!exercise.exerciseId || !exercise.recordType) return false;

  if (exercise.recordType === "time") {
    return exercise.targetTime !== "" && Number(exercise.targetTime) > 0;
  }

  if (exercise.targetSets === "" || Number(exercise.targetSets) < 1) return false;
  if (exercise.restSeconds === "" || Number(exercise.restSeconds) < 0) return false;

  if (exercise.recordType === "reps_only" || exercise.recordType === "weight_reps") {
    return exercise.targetReps !== "" && Number(exercise.targetReps) > 0;
  }

  return false;
};

export const toProgramExercisesPayload = (
  exercises: ProgramExerciseForm[],
  programId: string
): ProgramExercisePayload[] =>
  exercises.map((ex, index) => ({
    program_id: programId,
    exercise_id: ex.exerciseId,
    order: index,
    target_sets: Number(ex.targetSets),
    target_weight: ex.recordType === "weight_reps" ? numberOrNull(ex.targetWeight) : null,
    target_reps:
      ex.recordType === "reps_only" || ex.recordType === "weight_reps"
        ? numberOrNull(ex.targetReps)
        : null,
    target_time: ex.recordType === "time" ? numberOrNull(ex.targetTime) : null,
    rest_seconds: ex.recordType === "time" ? null : numberOrNull(ex.restSeconds),
  }));

export const looksLikeMissingColumn = (error: unknown, column: string) => {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: unknown }).message;
  return (
    typeof message === "string" &&
    message.toLowerCase().includes(column.toLowerCase()) &&
    message.toLowerCase().includes("does not exist")
  );
};

export const isRlsError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return false;
  return message.toLowerCase().includes("row-level security") || message.toLowerCase().includes("rls");
};

export const formatUnknownError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const anyErr = error as ErrorWithMessage;
    const message = typeof anyErr.message === "string" ? anyErr.message : undefined;
    const details = typeof anyErr.details === "string" ? anyErr.details : undefined;
    const hint = typeof anyErr.hint === "string" ? anyErr.hint : undefined;
    const code = typeof anyErr.code === "string" ? anyErr.code : undefined;

    const parts = [message, details, hint, code ? `code: ${code}` : undefined].filter(Boolean);
    if (parts.length) return parts.join("\n");

    try {
      return JSON.stringify(error);
    } catch {
      return "알 수 없는 오류";
    }
  }
  return "알 수 없는 오류";
};
