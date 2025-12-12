"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProgramForm } from "@/hooks/useProgramForm";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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

      // 1. 프로그램 저장
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .insert({
          user_id: user.id,
          title: formState.title.trim(),
          description: formState.description.trim(),
        })
        .select()
        .single();

      if (programError) throw programError;
      if (!programData) throw new Error('프로그램 저장에 실패했습니다.');

      const programId = programData.id;

      // 2. 운동 목록 저장
      const programExercises = formState.exercises
        .filter((ex) => {
          return (
            ex.name.trim() &&
            ex.target.sets !== "" &&
            Number(ex.target.sets) >= 1 &&
            ex.target.reps.min !== "" &&
            ex.target.reps.max !== "" &&
            ex.restSeconds !== ""
          );
        })
        .map((ex, index) => ({
          program_id: programId,
          user_id: user.id,
          name: ex.name.trim(),
          target_sets: Number(ex.target.sets),
          target_reps: Number(ex.target.reps.min),
          rest_seconds: Number(ex.restSeconds),
          intention: ex.intention?.trim() || null,
          note: ex.note?.trim() || null,
          order: index,
        }));

      const { error: exercisesError } = await supabase
        .from('program_exercises')
        .insert(programExercises);

      if (exercisesError) throw exercisesError;

      setSavedProgramInfo({
        title: formState.title,
        exerciseCount: programExercises.length
      });
      setIsSaving(false);
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Save error:', error);
      setIsSaving(false);
      alert(`저장 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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
        <section className="bg-white rounded-xl shadow-md p-4 mb-6">
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
        </section>

        {/* Exercises list */}
        <section className="space-y-4 mb-6">
          {formState.exercises.map((ex, i) => (
            <div key={ex.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    value={ex.name}
                    onChange={(e) => actions.updateExercise(ex.id, (prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="운동명"
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
                  value={ex.target.sets}
                  onChange={(e) => {
                    const val = actions.handleNumericInput(e.target.value, 'sets', ex.id);
                    actions.updateExercise(ex.id, (prev) => ({ ...prev, target: { ...prev.target, sets: val } }));
                  }}
                  placeholder="세트"
                  error={validation.inputErrors[`${ex.id}-sets`]}
                  className="text-sm"
                />
                <Input
                  label="휴식 시간(초)"
                  type="text"
                  inputMode="numeric"
                  value={ex.restSeconds}
                  onChange={(e) => {
                    const val = actions.handleNumericInput(e.target.value, 'rest', ex.id);
                    actions.updateExercise(ex.id, (prev) => ({ ...prev, restSeconds: val }));
                  }}
                  placeholder="초"
                  error={validation.inputErrors[`${ex.id}-rest`]}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input
                  label="최소 횟수"
                  type="text"
                  inputMode="numeric"
                  value={ex.target.reps.min}
                  onChange={(e) => {
                    const val = actions.handleNumericInput(e.target.value, 'reps-min', ex.id);
                    actions.updateExercise(ex.id, (prev) => ({
                      ...prev,
                      target: { ...prev.target, reps: { ...prev.target.reps, min: val } }
                    }));
                  }}
                  placeholder="최소"
                  error={validation.inputErrors[`${ex.id}-reps-min`]}
                  className="text-sm"
                />
                <Input
                  label="최대 횟수"
                  type="text"
                  inputMode="numeric"
                  value={ex.target.reps.max}
                  onChange={(e) => {
                    const val = actions.handleNumericInput(e.target.value, 'reps-max', ex.id);
                    actions.updateExercise(ex.id, (prev) => ({
                      ...prev,
                      target: { ...prev.target, reps: { ...prev.target.reps, max: val } }
                    }));
                  }}
                  placeholder="최대"
                  error={validation.inputErrors[`${ex.id}-reps-max`]}
                  className="text-sm"
                />
              </div>

              <Input
                label="의도 (선택)"
                value={ex.intention}
                onChange={(e) => actions.updateExercise(ex.id, (prev) => ({ ...prev, intention: e.target.value }))}
                placeholder="예: 가슴 근육 강화"
                className="mb-3 text-sm"
              />

              <Input
                as="textarea"
                label="메모 (선택)"
                value={ex.note}
                onChange={(e) => actions.updateExercise(ex.id, (prev) => ({ ...prev, note: e.target.value }))}
                placeholder="추가 설명"
                rows={2}
                className="text-sm"
              />

              {validation.errors.exercises?.[ex.id]?.summary && (
                <p className="text-sm text-red-600 mt-2">{validation.errors.exercises[ex.id].summary}</p>
              )}
            </div>
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
      {showSuccessModal && savedProgramInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">저장 완료!</h2>
              <p className="text-slate-600">
                <span className="font-semibold text-blue-600">{savedProgramInfo.title}</span> 프로그램이 저장되었습니다.
              </p>
            </div>
            <Button
              onClick={() => router.push('/')}
              variant="primary"
              fullWidth
            >
              홈으로
            </Button>
          </div>
        </div>
      )}

      {/* Duplicate Name Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">중복된 프로그램 이름</h2>
              <p className="text-slate-600">이미 존재하는 프로그램 이름입니다</p>
            </div>

            <div className="mb-6 bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-2">중복된 이름</p>
                <p className="font-semibold text-slate-800 text-lg">&ldquo;{duplicateTitle}&rdquo;</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 text-center mb-6">
              다른 이름을 사용해주세요
            </p>

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
          </div>
        </div>
      )}
    </div>
  );
}
