"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProgramForm, type ProgramExerciseForm } from "@/hooks/useProgramForm";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import ExerciseSelector from "@/components/ExerciseSelector";
import type { ExerciseMeta } from "@/constants/exercise";

const toExerciseMeta = (exercise: ProgramExerciseForm): ExerciseMeta | null => {
  if (!exercise.exerciseId || !exercise.recordType || !exercise.targetPart) return null;
  return {
    id: exercise.exerciseId,
    name: exercise.exerciseName,
    record_type: exercise.recordType,
    target_part: exercise.targetPart,
  };
};

const numberOrNull = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const looksLikeMissingColumn = (error: unknown, column: string) => {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.toLowerCase().includes(column.toLowerCase()) && message.toLowerCase().includes("does not exist");
};

const isRlsError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return false;
  return message.toLowerCase().includes("row-level security") || message.toLowerCase().includes("rls");
};

const formatUnknownError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const anyErr = error as any;
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

const isExerciseComplete = (exercise: ProgramExerciseForm) => {
  if (!exercise.exerciseId || !exercise.recordType) return false;
  if (exercise.targetSets === "" || Number(exercise.targetSets) < 1) return false;
  if (exercise.restSeconds === "" || Number(exercise.restSeconds) < 0) return false;

  if (exercise.recordType === "weight_reps") {
    return (
      exercise.targetWeight !== "" &&
      Number(exercise.targetWeight) > 0 &&
      exercise.targetReps !== "" &&
      Number(exercise.targetReps) > 0
    );
  }

  if (exercise.recordType === "reps_only") {
    return exercise.targetReps !== "" && Number(exercise.targetReps) > 0;
  }

  if (exercise.recordType === "time") {
    return exercise.targetTime !== "" && Number(exercise.targetTime) > 0;
  }

  return false;
};

export default function Page() {
  const router = useRouter();
  const { formState, validation, actions } = useProgramForm();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedProgramInfo, setSavedProgramInfo] = useState<{ title: string; exerciseCount: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState("");

  const save = async () => {
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
      // 인증 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert("로그인이 필요합니다. 다시 로그인해주세요.");
        router.push('/login');
        return;
      }

      // 최소 1개 이상 완성된 운동이 있어야 저장
      const completeExercises = formState.exercises.filter(isExerciseComplete);
      if (completeExercises.length === 0) {
        setIsSaving(false);
        alert("완성된 운동을 최소 1개 이상 추가해주세요.");
        return;
      }

      // 프로그램 제목 중복 체크
      const { data: existingPrograms, error: checkError } = await supabase
        .from('programs')
        .select('id, title')
        .eq('title', formState.title.trim());

      if (checkError) throw checkError;

      if (existingPrograms && existingPrograms.length > 0) {
        setDuplicateTitle(formState.title.trim());
        setShowDuplicateModal(true);
        setIsSaving(false);
        return;
      }

      // 1. 프로그램 저장 (DB에 rpe 컬럼이 없을 수 있어 fallback)
      const insertBase = {
        user_id: user.id,
        title: formState.title.trim(),
        description: formState.description.trim(),
      };

      let programData: any = null;
      let programError: any = null;

      ({ data: programData, error: programError } = await supabase
        .from('programs')
        .insert({
          ...insertBase,
          rpe: formState.rpe.trim() !== "" ? Number(formState.rpe) : null,
        })
        .select()
        .single());

      if (programError && looksLikeMissingColumn(programError, 'rpe')) {
        ({ data: programData, error: programError } = await supabase
          .from('programs')
          .insert(insertBase)
          .select()
          .single());
      }

      if (programError) throw programError;
      if (!programData) throw new Error('프로그램 저장에 실패했습니다.');

      const programId = programData.id;

      // 2. 운동 목록 저장
      const programExercises = completeExercises
        .map((ex, index) => ({
          program_id: programId,
          exercise_id: ex.exerciseId!,
          order: index,
          target_sets: Number(ex.targetSets),
          target_weight: ex.recordType === "weight_reps" ? numberOrNull(ex.targetWeight)! : null,
          // 일부 DB에서는 target_reps가 NOT NULL일 수 있어 time 타입에서 0을 넣고 target_time을 사용
          target_reps:
            ex.recordType === "time" ? 0 : numberOrNull(ex.targetReps)!,
          target_time: ex.recordType === "time" ? numberOrNull(ex.targetTime)! : null,
          rest_seconds: Number(ex.restSeconds),
          intention: ex.intention?.trim() || null,
        }));

      // Insert exercises with schema/policy fallbacks.
      let exercisesError: any = null;

      ({ error: exercisesError } = await supabase
        .from('program_exercises')
        .insert(programExercises));

      // If RLS blocks insert, try adding user_id if the column exists.
      if (exercisesError && isRlsError(exercisesError)) {
        const withUserId = programExercises.map((row) => ({ ...row, user_id: user.id }));
        ({ error: exercisesError } = await supabase
          .from('program_exercises')
          .insert(withUserId));
      }

      // If DB is still on the old schema (name/target_reps/target_sets), fall back.
      if (
        exercisesError &&
        (looksLikeMissingColumn(exercisesError, 'exercise_id') ||
          looksLikeMissingColumn(exercisesError, 'target_weight') ||
          looksLikeMissingColumn(exercisesError, 'target_time') ||
          looksLikeMissingColumn(exercisesError, 'record_type'))
      ) {
        const legacyRows = completeExercises.map((ex, index) => ({
          program_id: programId,
          name: ex.exerciseName,
          order: index,
          target_sets: Number(ex.targetSets),
          // legacy schema only supports reps; store time(seconds) into target_reps as a best-effort.
          target_reps: ex.recordType === 'time' ? Number(ex.targetTime) : Number(ex.targetReps),
          rest_seconds: Number(ex.restSeconds),
          intention: ex.intention?.trim() || null,
          note: null,
          user_id: user.id,
        }));

        ({ error: exercisesError } = await supabase
          .from('program_exercises')
          .insert(legacyRows as any));
      }

      if (exercisesError) {
        // Prevent creating a program with 0 exercises.
        await supabase.from('programs').delete().eq('id', programId);
        throw exercisesError;
      }

      setSavedProgramInfo({
        title: formState.title,
        exerciseCount: programExercises.length
      });
      setIsSaving(false);
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Save error:', error);
      setIsSaving(false);
      alert(`저장 중 오류가 발생했습니다.\n${formatUnknownError(error)}`);
    }
  };

  return (
    <div className="min-h-screen pb-32 px-4 pt-6 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">새 프로그램 만들기</h1>
        </header>

        {/* Basic info */}
        <Card padding="sm" className="mb-6">
          <Input
            label="프로그램 제목"
            value={formState.title}
            onChange={(e) => actions.setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            error={validation.errors.title}
            className="mb-4"
          />

          <Input
            as="textarea"
            label="전체 가이드"
            value={formState.description}
            onChange={(e) => actions.setDescription(e.target.value)}
            placeholder="프로그램의 전체 가이드를 입력하세요"
            error={validation.errors.description}
            rows={3}
          />
        </Card>

        {/* RPE 입력 */}
        <Card padding="sm">
          <Input
            label="RPE (운동 자각도, 선택)"
            type="text"
            inputMode="numeric"
            value={formState.rpe}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10)) {
                actions.setRpe(value);
              }
            }}
            placeholder="1~10 사이의 강도 (예: 8은 2개 더 가능)"
            helperText="RPE는 1~10 사이의 정수입니다. 예: 7은 3개 더 가능, 8은 2개 더 가능"
          />
        </Card>

        {/* Exercises list */}
        <section className="space-y-4 mb-6">
          {formState.exercises.map((ex) => (
            <Card key={ex.id} padding="sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex-1">
                  <ExerciseSelector
                    label="운동 선택"
                    value={toExerciseMeta(ex)}
                    onSelect={(selected) => {
                      actions.updateExercise(ex.id, (prev) => ({
                        ...prev,
                        exerciseId: selected.id,
                        exerciseName: selected.name,
                        recordType: selected.record_type,
                        targetPart: selected.target_part,
                        // 운동 타입이 바뀔 수 있으니 목표 입력값을 초기화
                        targetWeight: "",
                        targetReps: "",
                        targetTime: "",
                      }));
                    }}
                    onClear={() => {
                      actions.updateExercise(ex.id, (prev) => ({
                        ...prev,
                        exerciseId: "",
                        exerciseName: "",
                        recordType: "",
                        targetPart: "",
                      }));
                    }}
                  />
                </div>
                {formState.exercises.length > 1 && (
                  <button
                    onClick={() => actions.removeExercise(ex.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input
                  label="세트 수"
                  type="text"
                  inputMode="numeric"
                  value={ex.targetSets}
                  onChange={(e) => {
                    const val = actions.handleNumericInput(e.target.value, 'targetSets', ex.id);
                    actions.updateExercise(ex.id, (prev) => ({ ...prev, targetSets: val }));
                  }}
                  placeholder="세트"
                  error={validation.inputErrors[`${ex.id}-targetSets`]}
                  className="text-sm"
                />
                <Input
                  label="휴식 시간(초)"
                  type="text"
                  inputMode="numeric"
                  value={ex.restSeconds}
                  onChange={(e) => {
                    const val = actions.handleNumericInput(e.target.value, 'restSeconds', ex.id);
                    actions.updateExercise(ex.id, (prev) => ({ ...prev, restSeconds: val }));
                  }}
                  placeholder="초"
                  error={validation.inputErrors[`${ex.id}-restSeconds`]}
                  className="text-sm"
                />
              </div>

              {ex.recordType === "weight_reps" && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Input
                    label="목표 무게"
                    type="text"
                    inputMode="numeric"
                    value={ex.targetWeight}
                    onChange={(e) => {
                      const val = actions.handleNumericInput(e.target.value, 'targetWeight', ex.id);
                      actions.updateExercise(ex.id, (prev) => ({ ...prev, targetWeight: val }));
                    }}
                    placeholder="kg"
                    error={validation.inputErrors[`${ex.id}-targetWeight`]}
                    className="text-sm"
                  />
                  <Input
                    label="목표 횟수"
                    type="text"
                    inputMode="numeric"
                    value={ex.targetReps}
                    onChange={(e) => {
                      const val = actions.handleNumericInput(e.target.value, 'targetReps', ex.id);
                      actions.updateExercise(ex.id, (prev) => ({ ...prev, targetReps: val }));
                    }}
                    placeholder="회"
                    error={validation.inputErrors[`${ex.id}-targetReps`]}
                    className="text-sm"
                  />
                </div>
              )}

              {ex.recordType === "reps_only" && (
                <div className="mb-3">
                  <Input
                    label="목표 횟수"
                    type="text"
                    inputMode="numeric"
                    value={ex.targetReps}
                    onChange={(e) => {
                      const val = actions.handleNumericInput(e.target.value, 'targetReps', ex.id);
                      actions.updateExercise(ex.id, (prev) => ({ ...prev, targetReps: val }));
                    }}
                    placeholder="회"
                    error={validation.inputErrors[`${ex.id}-targetReps`]}
                    className="text-sm"
                  />
                </div>
              )}

              {ex.recordType === "time" && (
                <div className="mb-3">
                  <Input
                    label="목표 시간(초)"
                    type="text"
                    inputMode="numeric"
                    value={ex.targetTime}
                    onChange={(e) => {
                      const val = actions.handleNumericInput(e.target.value, 'targetTime', ex.id);
                      actions.updateExercise(ex.id, (prev) => ({ ...prev, targetTime: val }));
                    }}
                    placeholder="초"
                    error={validation.inputErrors[`${ex.id}-targetTime`]}
                    className="text-sm"
                  />
                </div>
              )}

              <Input
                label="의도 (선택)"
                value={ex.intention}
                onChange={(e) => actions.updateExercise(ex.id, (prev) => ({ ...prev, intention: e.target.value }))}
                placeholder="예: 가슴 근육 강화"
                className="text-sm"
              />

              {validation.errors.exercises?.[ex.id]?.summary && (
                <p className="text-sm text-red-600 mt-2">{validation.errors.exercises[ex.id].summary}</p>
              )}
            </Card>
          ))}

          <Button
            onClick={actions.addExercise}
            variant="outline"
            fullWidth
            className="border-2 border-dashed"
          >
            + 운동 추가
          </Button>
        </section>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <div className="max-w-md mx-auto">
          <Button
            onClick={save}
            disabled={isSaving}
            isLoading={isSaving}
            variant="primary"
            size="lg"
            fullWidth
            className="shadow-lg"
          >
            저장하기
          </Button>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal && !!savedProgramInfo}
        onClose={() => router.push('/')}
        variant="success"
        title="저장 완료!"
        description={savedProgramInfo ? `${savedProgramInfo.title} 프로그램이 저장되었습니다.` : ""}
        icon={
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        }
        actions={
          <Button onClick={() => router.push('/')} variant="primary" fullWidth>
            홈으로
          </Button>
        }
      />

      {/* Duplicate Name Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setDuplicateTitle("");
        }}
        variant="error"
        title="중복된 프로그램 이름"
        description="이미 존재하는 프로그램 이름입니다"
        icon={<span className="text-2xl">⚠️</span>}
        actions={
          <Button
            onClick={() => {
              setShowDuplicateModal(false);
              setDuplicateTitle("");
            }}
            variant="primary"
            fullWidth
          >
            확인
          </Button>
        }
      >
        <div className="mb-6 bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-2">중복된 이름</p>
            <p className="font-semibold text-slate-800 text-lg">&ldquo;{duplicateTitle}&rdquo;</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 text-center">
          다른 이름을 사용해주세요
        </p>
      </Modal>
    </div>
  );
}
