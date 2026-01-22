"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Trash, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import ExerciseSelector from "@/components/ExerciseSelector";
import TimeInput from "@/components/ui/TimeInput";
import { useProgramForm } from "@/hooks/useProgramForm";
import { useProgramEdit } from "@/hooks/useProgramEdit";
import { toExerciseMeta } from "@/lib/programs/form";

export default function ProgramEditPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;

  const { formState, validation, actions } = useProgramForm();
  const { loading, isSaving, showSuccessModal, setShowSuccessModal, save } = useProgramEdit({
    programId,
    formState,
    actions,
    validation,
  });

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
