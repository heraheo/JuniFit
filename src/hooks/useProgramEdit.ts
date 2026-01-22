import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatUnknownError,
  isExerciseComplete,
  isRlsError,
  looksLikeMissingColumn,
  toProgramExercisesPayload,
} from "@/lib/programs/form";
import type { ProgramExerciseForm, ProgramFormValidation } from "@/hooks/useProgramForm";

const createEmptyExercise = (): ProgramExerciseForm => ({
  id: String(Date.now()),
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

type ProgramFormState = {
  title: string;
  description: string;
  rpe: string;
  exercises: ProgramExerciseForm[];
};

type ProgramFormActions = {
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setRpe: (value: string) => void;
  setExercises: (exercises: ProgramExerciseForm[]) => void;
  resetValidation: () => void;
  validateForm: () => boolean;
};


type UseProgramEditOptions = {
  programId: string;
  formState: ProgramFormState;
  actions: ProgramFormActions;
  validation: ProgramFormValidation;
};

export const useProgramEdit = ({ programId, formState, actions, validation }: UseProgramEditOptions) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const fetchProgram = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const [programResult, exercisesResult] = await Promise.all([
        supabase.from("programs").select("*").eq("id", programId).single(),
        supabase
          .from("program_exercises")
          .select(
            "id, program_id, exercise_id, order, target_sets, target_reps, target_weight, target_time, rest_seconds, exercises ( id, name, target_part, record_type )"
          )
          .eq("program_id", programId)
          .order("order", { ascending: true }),
      ]);

      const { data: program, error: programError } = programResult;
      const { data: programExercises, error: exercisesError } = exercisesResult;

      if (programError && isRlsError(programError)) {
        alert("권한이 없습니다. 관리자에게 문의해주세요.");
        router.push("/programs/manage");
        return;
      }

      if (programError) throw programError;
      if (!program) throw new Error("프로그램을 찾을 수 없습니다.");

      if (exercisesError && isRlsError(exercisesError)) {
        alert("권한이 없습니다. 관리자에게 문의해주세요.");
        router.push("/programs/manage");
        return;
      }

      if (exercisesError) throw exercisesError;

      actions.setTitle(program.title);
      actions.setDescription(program.description || "");
      actions.setRpe(program.rpe ? String(program.rpe) : "");

      const convertedExercises: ProgramExerciseForm[] = (programExercises || []).map((ex: any) => {
        const meta = Array.isArray(ex.exercises) ? ex.exercises[0] : ex.exercises;
        return {
          id: ex.id,
          exerciseId: ex.exercise_id || "",
          exerciseName: meta?.name || "",
          recordType: meta?.record_type || "",
          targetPart: meta?.target_part || "",
          targetSets: ex.target_sets != null ? String(ex.target_sets) : "",
          restSeconds: ex.rest_seconds != null ? String(ex.rest_seconds) : "",
          targetWeight: ex.target_weight != null ? String(ex.target_weight) : "",
          targetReps: ex.target_reps != null ? String(ex.target_reps) : "",
          targetTime: ex.target_time != null ? String(ex.target_time) : "",
        };
      });

      actions.setExercises(
        convertedExercises.length > 0 ? convertedExercises : [createEmptyExercise()]
      );
      actions.resetValidation();
    } catch (error) {
      console.error("Error fetching program:", error);
      alert("프로그램을 불러오는데 실패했습니다.");
      router.push("/programs/manage");
    } finally {
      setLoading(false);
    }
  }, [programId, router, actions]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const save = useCallback(async () => {
    if (isSaving) return;

    const hasInputErrors = Object.keys(validation.inputErrors).length > 0;
    if (hasInputErrors) {
      alert("입력 오류를 먼저 수정해주세요.");
      return;
    }

    if (!actions.validateForm()) {
      alert("필수 입력란을 모두 채워주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        alert("로그인이 필요합니다. 다시 로그인해주세요.");
        router.push("/login");
        return;
      }

      const completeExercises = formState.exercises.filter(isExerciseComplete);
      if (completeExercises.length === 0) {
        setIsSaving(false);
        alert("완성된 운동을 최소 1개 이상 추가해주세요.");
        return;
      }

      let { error: programError } = await supabase
        .from("programs")
        .update({
          title: formState.title.trim(),
          description: formState.description.trim(),
          rpe: formState.rpe.trim() !== "" ? Number(formState.rpe) : null,
        })
        .eq("id", programId);

      if (programError && looksLikeMissingColumn(programError, "rpe")) {
        ({ error: programError } = await supabase
          .from("programs")
          .update({
            title: formState.title.trim(),
            description: formState.description.trim(),
          })
          .eq("id", programId));
      }

      if (programError && isRlsError(programError)) {
        alert("권한이 없습니다. 관리자에게 문의해주세요.");
        setIsSaving(false);
        return;
      }

      if (programError) throw programError;

      const { error: deleteError } = await supabase
        .from("program_exercises")
        .delete()
        .eq("program_id", programId);

      if (deleteError && isRlsError(deleteError)) {
        alert("권한이 없습니다. 관리자에게 문의해주세요.");
        setIsSaving(false);
        return;
      }

      if (deleteError) throw deleteError;

      const programExercises = toProgramExercisesPayload(completeExercises, programId);

      let exercisesError: any = null;
      ({ error: exercisesError } = await supabase
        .from("program_exercises")
        .insert(programExercises));

      if (exercisesError && isRlsError(exercisesError)) {
        alert("권한이 없습니다. 관리자에게 문의해주세요.");
        setIsSaving(false);
        return;
      }

      if (exercisesError) throw exercisesError;

      setIsSaving(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Update error:", error);
      setIsSaving(false);
      alert(`수정 중 오류가 발생했습니다.\n${formatUnknownError(error)}`);
    }
  }, [actions, formState, isSaving, programId, router, validation.inputErrors]);

  return {
    loading,
    isSaving,
    showSuccessModal,
    setShowSuccessModal,
    save,
  };
};
