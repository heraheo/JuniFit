"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Trash, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import ExerciseSelector from "@/components/ExerciseSelector";
import type { ExerciseMeta } from "@/constants/exercise";
import { validateNumericInput, validateProgramForm, type ProgramExerciseForm } from "@/lib/validation";

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

export default function ProgramEditPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rpe, setRpe] = useState("");
  const [exercises, setExercises] = useState<ProgramExerciseForm[]>([]);
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    exercises?: Record<string, { summary?: string }>;
  }>({});
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const fetchProgram = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // 프로그램 정보와 운동 목록을 병렬로 조회하여 속도 개선
      const [programResult, exercisesResult] = await Promise.all([
        supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single(),
        supabase
          .from('program_exercises')
          .select('id, program_id, exercise_id, order, target_sets, target_reps, target_weight, target_time, rest_seconds, intention, exercises ( id, name, target_part, record_type )')
          .eq('program_id', programId)
          .order('order', { ascending: true })
      ]);

      const { data: program, error: programError } = programResult;
      const { data: programExercises, error: exercisesError } = exercisesResult;

      if (programError) throw programError;
      if (!program) throw new Error('프로그램을 찾을 수 없습니다.');
      if (exercisesError) throw exercisesError;

      setTitle(program.title);
      setDescription(program.description || '');
      setRpe(program.rpe ? String(program.rpe) : '');

      // DB 데이터를 UI 형식으로 변환
      const convertedExercises: ProgramExerciseForm[] = (programExercises || []).map((ex: any) => {
        const meta = Array.isArray(ex.exercises) ? ex.exercises[0] : ex.exercises;
        return {
          id: ex.id,
          exerciseId: ex.exercise_id || '',
          exerciseName: meta?.name || '',
          recordType: meta?.record_type || '',
          targetPart: meta?.target_part || '',
          targetSets: ex.target_sets != null ? String(ex.target_sets) : '',
          restSeconds: ex.rest_seconds != null ? String(ex.rest_seconds) : '',
          targetWeight: ex.target_weight != null ? String(ex.target_weight) : '',
          targetReps: ex.target_reps != null ? String(ex.target_reps) : '',
          targetTime: ex.target_time != null ? String(ex.target_time) : '',
          intention: ex.intention || '',
        };
      });

      setExercises(convertedExercises.length > 0 ? convertedExercises : [
        {
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
          intention: "",
        }
      ]);

    } catch (error) {
      console.error('Error fetching program:', error);
      alert('프로그램을 불러오는데 실패했습니다.');
      router.push('/programs/manage');
    } finally {
      setLoading(false);
    }
  }, [programId, router]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      {
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
        intention: "",
      },
    ]);
  };

  const updateExercise = (id: string, updater: (ex: ProgramExerciseForm) => ProgramExerciseForm) => {
    setExercises((prev) => prev.map((ex) => (ex.id === id ? updater(ex) : ex)));
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
    setErrors((e) => {
      if (!e.exercises) return e;
      const copy = { ...e.exercises };
      delete copy[id];
      return { ...e, exercises: Object.keys(copy).length ? copy : undefined };
    });
  };

  const computeErrors = (): typeof errors => {
    return validateProgramForm(title, description, exercises);
  };

  const handleNumericInput = (value: string, field: string, exerciseId: string) => {
    const errorKey = `${exerciseId}-${field}`;
    const result = validateNumericInput(value);
    
    if (result.isValid) {
      setInputErrors((prev) => {
        const copy = { ...prev };
        delete copy[errorKey];
        return copy;
      });
    } else if (result.error) {
      setInputErrors((prev) => ({ ...prev, [errorKey]: result.error! }));
    }
    
    return result.sanitizedValue;
  };

  const save = async () => {
    if (isSaving) return;

    const hasInputErrors = Object.keys(inputErrors).length > 0;
    if (hasInputErrors) {
      alert("입력 오류를 먼저 수정해주세요.");
      return;
    }

    const computed = computeErrors();
    setErrors(computed);
    const hasErrors = Boolean(computed.title || computed.description || (computed.exercises && Object.keys(computed.exercises).length > 0));
    if (hasErrors) {
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

      const completeExercises = exercises.filter(isExerciseComplete);
      if (completeExercises.length === 0) {
        setIsSaving(false);
        alert("완성된 운동을 최소 1개 이상 추가해주세요.");
        return;
      }

      // 1. 프로그램 정보 업데이트
      let { error: programError } = await supabase
        .from('programs')
        .update({
          title: title.trim(),
          description: description.trim(),
          rpe: rpe.trim() !== "" ? Number(rpe) : null,
        })
        .eq('id', programId);

      if (programError && looksLikeMissingColumn(programError, 'rpe')) {
        ({ error: programError } = await supabase
          .from('programs')
          .update({
            title: title.trim(),
            description: description.trim(),
          })
          .eq('id', programId));
      }

      if (programError) throw programError;

      // 2. 기존 운동 목록 삭제
      const { error: deleteError } = await supabase
        .from('program_exercises')
        .delete()
        .eq('program_id', programId);

      if (deleteError) throw deleteError;

      // 3. 새로운 운동 목록 저장
      const programExercises = completeExercises
        .map((ex, index) => ({
          program_id: programId,
          exercise_id: ex.exerciseId,
          order: index,
          target_sets: Number(ex.targetSets),
          target_weight: ex.recordType === "weight_reps" ? numberOrNull(ex.targetWeight) : null,
          target_reps: ex.recordType === "time" ? 0 : numberOrNull(ex.targetReps),
          target_time: ex.recordType === "time" ? numberOrNull(ex.targetTime) : null,
          rest_seconds: Number(ex.restSeconds),
          intention: ex.intention?.trim() || null,
        }));

      const { error: exercisesError } = await supabase
        .from('program_exercises')
        .insert(programExercises);

      if (exercisesError) throw exercisesError;

      setIsSaving(false);
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Update error:', error);
      setIsSaving(false);
      alert(`수정 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 px-4 pt-6 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/programs/manage" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">프로그램 수정</h1>
        </header>

        {/* Basic info */}
        <Card padding="sm" className="mb-6">
          <Input
            label="프로그램 제목"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            placeholder="제목을 입력하세요"
            error={errors.title}
            className="mb-4"
          />

          <Input
            as="textarea"
            label="전체 가이드"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            placeholder="프로그램의 전체 가이드를 입력하세요"
            error={errors.description}
            rows={3}
          />
        {/* RPE 입력 */}
          <Input
            label="RPE (운동 자각도, 선택)"
            type="text"
            inputMode="numeric"
            value={rpe}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10)) {
                setRpe(value);
              }
            }}
            placeholder="1~10 사이의 강도 (예: 8은 2개 더 가능)"
          />
        </Card>

        {/* Exercises list */}
        <section className="space-y-4 mb-6">
          {exercises.map((ex, i) => (
            <Card key={ex.id} padding="sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex-1">
                  <ExerciseSelector
                    label="운동 선택"
                    value={toExerciseMeta(ex)}
                    onSelect={(selected) => {
                      updateExercise(ex.id, (prev) => ({
                        ...prev,
                        exerciseId: selected.id,
                        exerciseName: selected.name,
                        recordType: selected.record_type,
                        targetPart: selected.target_part,
                        targetWeight: "",
                        targetReps: "",
                        targetTime: "",
                      }));
                    }}
                    onClear={() => {
                      updateExercise(ex.id, (prev) => ({
                        ...prev,
                        exerciseId: "",
                        exerciseName: "",
                        recordType: "",
                        targetPart: "",
                      }));
                    }}
                  />
                </div>
                {exercises.length > 1 && (
                  <button
                    onClick={() => removeExercise(ex.id)}
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
                    const val = handleNumericInput(e.target.value, 'targetSets', ex.id);
                    updateExercise(ex.id, (prev) => ({ ...prev, targetSets: val }));
                  }}
                  placeholder="세트"
                  error={inputErrors[`${ex.id}-targetSets`]}
                  className="text-sm"
                />
                <Input
                  label="휴식 시간(초)"
                  type="text"
                  inputMode="numeric"
                  value={ex.restSeconds}
                  onChange={(e) => {
                    const val = handleNumericInput(e.target.value, 'restSeconds', ex.id);
                    updateExercise(ex.id, (prev) => ({ ...prev, restSeconds: val }));
                  }}
                  placeholder="초"
                  error={inputErrors[`${ex.id}-restSeconds`]}
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
                      const val = handleNumericInput(e.target.value, 'targetWeight', ex.id);
                      updateExercise(ex.id, (prev) => ({ ...prev, targetWeight: val }));
                    }}
                    placeholder="kg"
                    error={inputErrors[`${ex.id}-targetWeight`]}
                    className="text-sm"
                  />
                  <Input
                    label="목표 횟수"
                    type="text"
                    inputMode="numeric"
                    value={ex.targetReps}
                    onChange={(e) => {
                      const val = handleNumericInput(e.target.value, 'targetReps', ex.id);
                      updateExercise(ex.id, (prev) => ({ ...prev, targetReps: val }));
                    }}
                    placeholder="회"
                    error={inputErrors[`${ex.id}-targetReps`]}
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
                      const val = handleNumericInput(e.target.value, 'targetReps', ex.id);
                      updateExercise(ex.id, (prev) => ({ ...prev, targetReps: val }));
                    }}
                    placeholder="회"
                    error={inputErrors[`${ex.id}-targetReps`]}
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
                      const val = handleNumericInput(e.target.value, 'targetTime', ex.id);
                      updateExercise(ex.id, (prev) => ({ ...prev, targetTime: val }));
                    }}
                    placeholder="초"
                    error={inputErrors[`${ex.id}-targetTime`]}
                    className="text-sm"
                  />
                </div>
              )}

              <Input
                label="의도 (선택)"
                value={ex.intention}
                onChange={(e) => updateExercise(ex.id, (prev) => ({ ...prev, intention: e.target.value }))}
                placeholder="예: 가슴 근육 강화"
                className="text-sm"
              />

              {errors.exercises?.[ex.id]?.summary && (
                <p className="text-sm text-red-600 mt-2">{errors.exercises[ex.id].summary}</p>
              )}
            </Card>
          ))}

          <Button
            onClick={addExercise}
            variant="outline"
            fullWidth
            className="border-2 border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600"
          >
            + 운동 추가
          </Button>
        </section>

        {/* Save button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <div className="max-w-md mx-auto">
            <Button
              onClick={save}
              isLoading={isSaving}
              variant="primary"
              size="lg"
              fullWidth
              className="rounded-full py-4 font-semibold text-lg shadow-lg"
            >
              수정 완료
            </Button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => router.push('/programs/manage')}
        variant="success"
        title="수정 완료!"
        description={`${title} 프로그램이 수정되었습니다.`}
        icon={
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        }
        actions={
          <Button onClick={() => router.push('/programs/manage')} variant="primary" fullWidth className="py-3">
            프로그램 목록으로
          </Button>
        }
      />
    </div>
  );
}
