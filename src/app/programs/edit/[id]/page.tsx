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
import type { Program, ProgramExercise } from "@/types/database";
import { validateNumericInput, validateProgramForm, type ExerciseInput } from "@/lib/validation";

export default function ProgramEditPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<ExerciseInput[]>([]);
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
          .select('*')
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

      // DB 데이터를 UI 형식으로 변환
      const convertedExercises: ExerciseInput[] = (programExercises || []).map((ex) => ({
        id: ex.id,
        name: ex.name,
        target: {
          sets: ex.target_sets,
          reps: { min: ex.target_reps, max: ex.target_reps }
        },
        restSeconds: ex.rest_seconds,
        intention: ex.intention || '',
        note: ex.note || ''
      }));

      setExercises(convertedExercises.length > 0 ? convertedExercises : [
        { id: String(Date.now()), name: "", target: { sets: "", reps: { min: "", max: "" } }, restSeconds: "", intention: "", note: "" }
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
      { id: String(Date.now() + Math.random()), name: "", target: { sets: "", reps: { min: "", max: "" } }, restSeconds: "", intention: "", note: "" },
    ]);
  };

  const updateExercise = (id: string, updater: (ex: ExerciseInput) => ExerciseInput) => {
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

      // 1. 프로그램 정보 업데이트
      const { error: programError } = await supabase
        .from('programs')
        .update({
          title: title.trim(),
          description: description.trim(),
        })
        .eq('id', programId);

      if (programError) throw programError;

      // 2. 기존 운동 목록 삭제
      const { error: deleteError } = await supabase
        .from('program_exercises')
        .delete()
        .eq('program_id', programId);

      if (deleteError) throw deleteError;

      // 3. 새로운 운동 목록 저장
      const programExercises = exercises
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
        </Card>

        {/* Exercises list */}
        <section className="space-y-4 mb-6">
          {exercises.map((ex, i) => (
            <Card key={ex.id} padding="sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    value={ex.name}
                    onChange={(e) => {
                      const newEx = { ...ex, name: e.target.value };
                      updateExercise(ex.id, () => newEx);
                    }}
                    placeholder="운동명"
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
                  value={ex.target.sets}
                  onChange={(e) => {
                    const val = handleNumericInput(e.target.value, 'sets', ex.id);
                    updateExercise(ex.id, (prev) => ({ ...prev, target: { ...prev.target, sets: val } }));
                  }}
                  placeholder="세트"
                  error={inputErrors[`${ex.id}-sets`]}
                  className="text-sm"
                />
                <Input
                  label="휴식 시간(초)"
                  type="text"
                  inputMode="numeric"
                  value={ex.restSeconds}
                  onChange={(e) => {
                    const val = handleNumericInput(e.target.value, 'rest', ex.id);
                    updateExercise(ex.id, (prev) => ({ ...prev, restSeconds: val }));
                  }}
                  placeholder="초"
                  error={inputErrors[`${ex.id}-rest`]}
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
                    const val = handleNumericInput(e.target.value, 'reps-min', ex.id);
                    updateExercise(ex.id, (prev) => ({
                      ...prev,
                      target: { ...prev.target, reps: { ...prev.target.reps, min: val } }
                    }));
                  }}
                  placeholder="최소"
                  error={inputErrors[`${ex.id}-reps-min`]}
                  className="text-sm"
                />
                <Input
                  label="최대 횟수"
                  type="text"
                  inputMode="numeric"
                  value={ex.target.reps.max}
                  onChange={(e) => {
                    const val = handleNumericInput(e.target.value, 'reps-max', ex.id);
                    updateExercise(ex.id, (prev) => ({
                      ...prev,
                      target: { ...prev.target, reps: { ...prev.target.reps, max: val } }
                    }));
                  }}
                  placeholder="최대"
                  error={inputErrors[`${ex.id}-reps-max`]}
                  className="text-sm"
                />
              </div>

              <Input
                label="의도 (선택)"
                value={ex.intention}
                onChange={(e) => updateExercise(ex.id, (prev) => ({ ...prev, intention: e.target.value }))}
                placeholder="예: 가슴 근육 강화"
                className="mb-3 text-sm"
              />

              <Input
                as="textarea"
                label="메모 (선택)"
                value={ex.note}
                onChange={(e) => updateExercise(ex.id, (prev) => ({ ...prev, note: e.target.value }))}
                placeholder="추가 설명"
                rows={2}
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
