import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Program } from "@/types/database";
import { mapProgramsWithExercises, type ProgramWithExercises } from "@/lib/programs/manage";

type UseProgramsManageState = {
  programs: ProgramWithExercises[];
  loading: boolean;
  deleting: string | null;
  expandedProgram: string | null;
};

export const useProgramsManage = () => {
  const [programs, setPrograms] = useState<ProgramWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [programsResult, exercisesResult] = await Promise.all([
      supabase
        .from("programs")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("program_exercises")
        .select(
          "id, program_id, exercise_id, order, target_sets, target_reps, target_weight, target_time, rest_seconds, created_at, exercises ( name, target_part, record_type )"
        )
        .order("order", { ascending: true }),
    ]);

    const { data: programsData, error: programsError } = programsResult;
    const { data: allExercises, error: exercisesError } = exercisesResult;

    if (programsError) {
      console.error("Error fetching programs:", programsError);
      alert("프로그램 목록을 불러오는데 실패했습니다.");
      setPrograms([]);
    } else if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      setPrograms(programsData || []);
    } else {
      const programsWithExercises = mapProgramsWithExercises(
        (programsData || []) as Program[],
        (allExercises || []) as any
      );
      setPrograms(programsWithExercises);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const toggleProgram = useCallback((programId: string) => {
    setExpandedProgram((prev) => (prev === programId ? null : programId));
  }, []);

  const handleDelete = useCallback(
    async (program: Program) => {
      const confirmed = window.confirm(`"${program.title}" 프로그램을 삭제하시겠습니까?`);

      if (!confirmed) return;

      setDeleting(program.id);

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("programs")
          .update({ is_archived: true })
          .eq("id", program.id);

        if (error) throw error;

        await fetchPrograms();
      } catch (error) {
        console.error("Error archiving program:", error);
        alert("프로그램 삭제에 실패했습니다.");
      } finally {
        setDeleting(null);
      }
    },
    [fetchPrograms]
  );

  return {
    state: {
      programs,
      loading,
      deleting,
      expandedProgram,
    } as UseProgramsManageState,
    actions: {
      toggleProgram,
      handleDelete,
      refresh: fetchPrograms,
    },
  };
};
