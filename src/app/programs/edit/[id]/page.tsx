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
import TimeInput from "@/components/ui/TimeInput";
import { useProgramForm, type ProgramExerciseForm } from "@/hooks/useProgramForm";
import {
  formatUnknownError,
  isExerciseComplete,
  isRlsError,
  looksLikeMissingColumn,
  toExerciseMeta,
  toProgramExercisesPayload,
} from "@/lib/programs/form";

export default function ProgramEditPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;

  const [loading, setLoading] = useState(true);
  const { formState, validation, actions } = useProgramForm();
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
          .select('id, program_id, exercise_id, order, target_sets, target_reps, target_weight, target_time, rest_seconds, exercises ( id, name, target_part, record_type )')
          .eq('program_id', programId)
          .order('order', { ascending: true })
      ]);

      const { data: program, error: programError } = programResult;
      const { data: programExercises, error: exercisesError } = exercisesResult;

      if (programError && isRlsError(programError)) {
        alert("권한이 없습니다. 관리자에게 문의해주세요.");
        router.push('/programs/manage');
        return;
      }

      if (programError) throw programError;
      if (!program) throw new Error('프로그램을 찾을 수 없습니다.');

      if (exercisesError && isRlsError(exercisesError)) {
        alert("권한이 없습니다. 관리자에게 문의해주세요.");
        router.push('/programs/manage');
        return;
      }

      if (exercisesError) throw exercisesError;

      actions.setTitle(program.title);
      actions.setDescription(program.description || '');
      actions.setRpe(program.rpe ? String(program.rpe) : '');

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
        };
      });

      actions.setExercises(
        convertedExercises.length > 0
          ? convertedExercises
          : [
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
              },
            ]
      );
      actions.resetValidation();

    } catch (error) {
      console.error('Error fetching program:', error);
      alert('프로그램을 불러오는데 실패했습니다.');
      router.push('/programs/manage');
    } finally {
      setLoading(false);
    }
  }, [programId, router, actions]);


  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);


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

      const completeExercises = formState.exercises.filter(isExerciseComplete);
      if (completeExercises.length === 0) {
        setIsSaving(false);
        alert("완성된 운동을 최소 1개 이상 추가해주세요.");
        return;
      }

      // 1. 프로그램 정보 업데이트
      let { error: programError } = await supabase
        .from('programs')
        .update({
          title: formState.title.trim(),
          description: formState.description.trim(),
          rpe: formState.rpe.trim() !== "" ? Number(formState.rpe) : null,
        })
        .eq('id', programId);

      if (programError && looksLikeMissingColumn(programError, 'rpe')) {
        ({ error: programError } = await supabase
          .from('programs')
          .update({
            title: formState.title.trim(),
            description: formState.description.trim(),
          })
          .eq('id', programId));
      }

      if (programError && isRlsError(programError)) {
        alert("권한이 없습니다. 관리자에게 문의해주세요.");
        setIsSaving(false);
        return;
      }

      if (programError) throw programError;

      // 2. 기존 운동 목록 삭제
      const { error: deleteError } = await supabase
        .from('program_exercises')
        .delete()
        .eq('program_id', programId);

      if (deleteError && isRlsError(deleteError)) {
        alert("권한이 없습니다. 관리자에게 문의해주세요.");
        setIsSaving(false);
        return;
      }

      if (deleteError) throw deleteError;

      // 3. 새로운 운동 목록 저장
      const programExercises = toProgramExercisesPayload(completeExercises, programId);

      let exercisesError: any = null;
      ({ error: exercisesError } = await supabase
        .from('program_exercises')
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
      console.error('Update error:', error);
      setIsSaving(false);
      alert(`수정 중 오류가 발생했습니다.\n${formatUnknownError(error)}`);
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
          {/* RPE 입력 */}
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

              {/* 세트 수 - weight_reps, reps_only만 표시 */}
              {ex.recordType !== "time" && (
                <div className="mb-3">
                  <Input
                    label="세트 수"
                    type="text"
                    inputMode="numeric"
                    value={ex.targetSets}
                    onChange={(e) => {
                      const val = actions.handleNumericInput(e.target.value, "targetSets", ex.id);
                      actions.updateExercise(ex.id, (prev) => ({ ...prev, targetSets: val }));
                    }}
                    placeholder="세트"
                    error={validation.inputErrors[`${ex.id}-targetSets`]}
                    className="text-sm"
                  />
                </div>
              )}

              {/* 휴식 시간 - weight_reps, reps_only만 표시 */}
              {ex.recordType !== "time" && (
                <div className="mb-3">
                  <Input
                    label="휴식 시간(초)"
                    type="text"
                    inputMode="numeric"
                    value={ex.restSeconds}
                    onChange={(e) => {
                      const val = actions.handleNumericInput(e.target.value, "restSeconds", ex.id);
                      actions.updateExercise(ex.id, (prev) => ({ ...prev, restSeconds: val }));
                    }}
                    placeholder="초"
                    error={validation.inputErrors[`${ex.id}-restSeconds`]}
                    className="text-sm"
                  />
                </div>
              )}

              {/* weight_reps: 목표 횟수만 (무게는 자유 기록) */}
              {ex.recordType === "weight_reps" && (
                <div className="mb-3">
                  <Input
                    label="목표 횟수"
                    type="text"
                    inputMode="numeric"
                    value={ex.targetReps}
                    onChange={(e) => {
                      const val = actions.handleNumericInput(e.target.value, "targetReps", ex.id);
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
                  <TimeInput
                    label="목표 시간"
                    value={ex.targetTime}
                    onChange={(seconds) => {
                      actions.updateExercise(ex.id, (prev) => ({ ...prev, targetTime: seconds }));
                    }}
                    error={validation.inputErrors[`${ex.id}-targetTime`]}
                    placeholder="0"
                    disabled={false}
                    className="text-sm"
                  />
                </div>
              )}

              {validation.errors.exercises?.[ex.id]?.summary && (
                <p className="text-sm text-red-600 mt-2">{validation.errors.exercises[ex.id].summary}</p>
              )}
            </Card>
          ))}

          <Button
            onClick={actions.addExercise}
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
        description={`${formState.title} 프로그램이 수정되었습니다.`}
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
