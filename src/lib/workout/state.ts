import type { ProgramWithExercises } from "@/lib/api";

type SetInput = {
  weight: string;
  reps: string;
  time: string;
  completed: boolean;
};

type ExerciseNotes = {
  [exerciseId: string]: string;
};

export const createInitialWorkoutState = (program: ProgramWithExercises) => {
  const inputs: Record<string, SetInput[]> = {};
  const notes: ExerciseNotes = {};

  program.exercises.forEach((exercise) => {
    const setsCount = exercise.target_sets || 1;
    inputs[exercise.id] = Array(setsCount)
      .fill(null)
      .map(() => ({
        weight: "",
        reps: "",
        time: "",
        completed: false,
      }));
    notes[exercise.id] = "";
  });

  return { inputs, notes };
};
