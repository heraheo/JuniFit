import { createClient } from "@/lib/supabase/client";
import type { Program, ProgramExercise } from "@/types/database";

export type ProgramWithExercises = Program & {
  exercises: ProgramExercise[];
  exerciseCount: number;
};

export async function getPrograms(): Promise<ProgramWithExercises[]> {
  const supabase = createClient();
  const { data: programs, error: programsError } = await supabase
    .from("programs")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  if (programsError) {
    console.error("Error fetching programs:", programsError);
    return [];
  }

  if (programs.length === 0) return [];

  const { data: allExercises } = await supabase
    .from("program_exercises")
    .select("program_id")
    .in(
      "program_id",
      programs.map((program) => program.id)
    );

  const exerciseCountMap: Record<string, number> = {};
  allExercises?.forEach((ex) => {
    exerciseCountMap[ex.program_id] = (exerciseCountMap[ex.program_id] || 0) + 1;
  });

  return programs.map((program) => ({
    ...program,
    exercises: [],
    exerciseCount: exerciseCountMap[program.id] || 0,
  }));
}

export async function getProgramById(id: string): Promise<ProgramWithExercises | null> {
  const supabase = createClient();
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .eq("is_archived", false)
    .single();

  if (programError || !program) {
    console.error("Error fetching program:", programError);
    return null;
  }

  const { data: exercises, error: exercisesError } = await supabase
    .from("program_exercises")
    .select(
      "id, program_id, exercise_id, order, target_sets, target_reps, target_weight, target_time, rest_seconds, created_at, exercises ( name, target_part, record_type )"
    )
    .eq("program_id", id)
    .order("order", { ascending: true });

  if (exercisesError) {
    console.error("Error fetching exercises:", exercisesError);
    return null;
  }

  return {
    ...program,
    exercises:
      (exercises || []).map((ex: any) => {
        const meta = Array.isArray(ex.exercises) ? ex.exercises[0] : ex.exercises;
        return {
          ...ex,
          name: meta?.name ?? "",
          target_part: meta?.target_part,
          record_type: meta?.record_type,
        };
      }) || [],
    exerciseCount: exercises?.length || 0,
  };
}
