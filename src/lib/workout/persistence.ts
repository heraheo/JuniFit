import { saveWorkoutSet, completeWorkoutSession, updateWorkoutSet } from "@/lib/api";
import type { ProgramWithExercises } from "@/lib/api";
import type { WorkoutSet } from "@/types/database";

type SetInput = {
  weight: string;
  reps: string;
  time: string;
  completed: boolean;
};

type ExerciseNotes = {
  [exerciseId: string]: string;
};

type EditingSet = {
  id: string;
  weight: string;
  reps: string;
  time: string;
};

type SaveSessionArgs = {
  sessionId: string | null;
  program: ProgramWithExercises | null;
  inputs: Record<string, SetInput[]>;
  notes: ExerciseNotes;
};

type SaveEditArgs = {
  sets: WorkoutSet[];
  editingSets: Record<string, EditingSet>;
};

type SaveResult = { ok: true } | { ok: false; message: string };

type EditResult = { ok: true; changed: boolean } | { ok: false; message: string };

export const persistWorkoutSession = async ({
  sessionId,
  program,
  inputs,
  notes,
}: SaveSessionArgs): Promise<SaveResult> => {
  if (!sessionId || !program) {
    return { ok: false, message: "세션 정보가 올바르지 않습니다." };
  }

  try {
    for (const exercise of program.exercises) {
      const exerciseInputs = inputs[exercise.id] || [];
      const exerciseNote = notes[exercise.id] || "";

      for (let i = 0; i < exerciseInputs.length; i++) {
        const set = exerciseInputs[i];
        const recordType = exercise.record_type;

        if (!set.completed) continue;

        const weight =
          set.completed && recordType === "weight_reps"
            ? Number.parseFloat(set.weight) || 0
            : null;
        const reps =
          set.completed && (recordType === "weight_reps" || recordType === "reps_only")
            ? Number.parseInt(set.reps, 10) || 0
            : null;
        const time =
          set.completed && recordType === "time" ? Number.parseFloat(set.time) || 0 : null;

        const result = await saveWorkoutSet(
          sessionId,
          exercise.exercise_id,
          exercise.name,
          i + 1,
          weight,
          reps,
          time,
          exerciseNote || null
        );

        if (!result) {
          return { ok: false, message: `${exercise.name} ${i + 1}세트 저장 실패` };
        }
      }
    }

    const sessionResult = await completeWorkoutSession(sessionId);
    if (!sessionResult) {
      return { ok: false, message: "세션 완료 처리 실패" };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return { ok: false, message };
  }
};

export const persistWorkoutEdits = async ({
  sets,
  editingSets,
}: SaveEditArgs): Promise<EditResult> => {
  let changed = false;

  try {
    for (const set of sets) {
      const editedSet = editingSets[set.id];
      if (!editedSet) continue;

      const weight = Number.parseFloat(editedSet.weight) || 0;
      const reps = Number.parseInt(editedSet.reps, 10) || 0;
      const time = Number.parseFloat(editedSet.time) || 0;

      if (weight !== set.weight || reps !== set.reps || time !== set.time) {
        changed = true;
        await updateWorkoutSet(set.id, weight || null, reps || null, time || null);
      }
    }

    return { ok: true, changed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return { ok: false, message };
  }
};
