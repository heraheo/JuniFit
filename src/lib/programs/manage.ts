import type { ExercisePart, ExerciseRecordType } from "@/constants/exercise";
import type { Program, ProgramExercise } from "@/types/database";

type ExerciseMeta = {
  name?: string;
  target_part?: ExercisePart;
  record_type?: ExerciseRecordType;
};

type ExerciseRow = ProgramExercise & {
  exercises?: ExerciseMeta | ExerciseMeta[] | null;
};

export type ProgramWithExercises = Program & {
  exercises?: ProgramExercise[];
};

export const mapProgramsWithExercises = (
  programs: Program[],
  exercises: ExerciseRow[] | null | undefined
): ProgramWithExercises[] =>
  programs.map((program) => ({
    ...program,
    exercises:
      exercises
        ?.filter((exercise) => exercise.program_id === program.id)
        .map((exercise) => {
          const meta = Array.isArray(exercise.exercises) ? exercise.exercises[0] : exercise.exercises;
          return {
            ...exercise,
            name: meta?.name ?? "",
            target_part: meta?.target_part ?? "full_body",
            record_type: meta?.record_type ?? "weight_reps",
          };
        }) || [],
  }));
