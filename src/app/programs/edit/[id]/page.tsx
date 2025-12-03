"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Trash, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Program, ProgramExercise } from "@/types/database";

type ExerciseInput = {
  id: string;
  name: string;
  target: { sets: number | string; reps: { min: number | string; max: number | string } };
  restSeconds: number | string;
  intention: string;
  note: string;
};

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

  useEffect(() => {
    fetchProgram();
  }, [programId]);

  async function fetchProgram() {
    setLoading(true);
    try {
      // 프로그램 정보 가져오기
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (programError) throw programError;
      if (!program) throw new Error('프로그램을 찾을 수 없습니다.');

      // 프로그램 운동 목록 가져오기
      const { data: programExercises, error: exercisesError } = await supabase
        .from('program_exercises')
        .select('*')
        .eq('program_id', programId)
        .order('order', { ascending: true });

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
  }

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

  const getMissingSummary = (ex: ExerciseInput, idx: number) => {
    const missing: string[] = [];
    if (!ex.name.trim()) missing.push("운동명");
    if (ex.target.sets === "" || Number(ex.target.sets) < 1) missing.push("세트 수");
    if (ex.target.reps.min === "" || ex.target.reps.max === "") missing.push("횟수(최소/최대)");
    if (ex.restSeconds === "" || Number(ex.restSeconds) < 0) missing.push("휴식 시간(초)");
    if (missing.length === 0) return undefined;
    return `${missing.join(", ")}을 입력해주세요`;
  };

  const computeErrors = (): typeof errors => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = "프로그램 제목을 입력하세요.";
    if (!description.trim()) newErrors.description = "전체 가이드를 입력하세요.";

    let hasValidExercise = false;
    exercises.forEach((ex, i) => {
      const id = ex.id;
      const idx = i + 1;
      let hasMissing = false;
      if (!ex.name.trim()) hasMissing = true;
      if (ex.target.sets === "" || Number(ex.target.sets) < 1) hasMissing = true;
      if (ex.target.reps.min === "" || ex.target.reps.max === "") hasMissing = true;
      if (ex.restSeconds === "" || Number(ex.restSeconds) < 0) hasMissing = true;

      if (hasMissing) {
        newErrors.exercises = newErrors.exercises || {};
        const msg = getMissingSummary(ex, idx);
        newErrors.exercises[id] = { summary: msg || "운동 이름, 세트 수를 입력해주세요" };
      } else {
        hasValidExercise = true;
      }
    });

    if (!hasValidExercise) {
      newErrors.exercises = newErrors.exercises || {};
    }

    return newErrors;
  };

  const handleNumericInput = (value: string, field: string, exerciseId: string) => {
    const errorKey = `${exerciseId}-${field}`;
    
    if (value === "") {
      setInputErrors((prev) => {
        const copy = { ...prev };
        delete copy[errorKey];
        return copy;
      });
      return "";
    }

    if (!/^\d+$/.test(value)) {
      setInputErrors((prev) => ({ ...prev, [errorKey]: "숫자만 입력해주세요" }));
      return value;
    }

    setInputErrors((prev) => {
      const copy = { ...prev };
      delete copy[errorKey];
      return copy;
    });
    return value;
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
        <section className="bg-white rounded-xl shadow-md p-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">프로그램 제목</label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            className="w-full p-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="제목을 입력하세요"
          />
          {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}

          <label className="block text-sm font-medium text-slate-700 mb-2">전체 가이드</label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="프로그램의 전체 가이드를 입력하세요"
          />
          {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
        </section>

        {/* Exercises list */}
        <section className="space-y-4 mb-6">
          {exercises.map((ex, i) => (
            <div key={ex.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex-1">
                  <input
                    value={ex.name}
                    onChange={(e) => {
                      const newEx = { ...ex, name: e.target.value };
                      updateExercise(ex.id, () => newEx);
                    }}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">세트 수</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={ex.target.sets}
                    onChange={(e) => {
                      const val = handleNumericInput(e.target.value, 'sets', ex.id);
                      updateExercise(ex.id, (prev) => ({ ...prev, target: { ...prev.target, sets: val } }));
                    }}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="세트"
                  />
                  {inputErrors[`${ex.id}-sets`] && (
                    <p className="text-xs text-red-600 mt-1">{inputErrors[`${ex.id}-sets`]}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">휴식 시간(초)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={ex.restSeconds}
                    onChange={(e) => {
                      const val = handleNumericInput(e.target.value, 'rest', ex.id);
                      updateExercise(ex.id, (prev) => ({ ...prev, restSeconds: val }));
                    }}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="초"
                  />
                  {inputErrors[`${ex.id}-rest`] && (
                    <p className="text-xs text-red-600 mt-1">{inputErrors[`${ex.id}-rest`]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">최소 횟수</label>
                  <input
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
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="최소"
                  />
                  {inputErrors[`${ex.id}-reps-min`] && (
                    <p className="text-xs text-red-600 mt-1">{inputErrors[`${ex.id}-reps-min`]}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">최대 횟수</label>
                  <input
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
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="최대"
                  />
                  {inputErrors[`${ex.id}-reps-max`] && (
                    <p className="text-xs text-red-600 mt-1">{inputErrors[`${ex.id}-reps-max`]}</p>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label className="text-xs text-slate-600 mb-1 block">의도 (선택)</label>
                <input
                  value={ex.intention}
                  onChange={(e) => updateExercise(ex.id, (prev) => ({ ...prev, intention: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 가슴 근육 강화"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 mb-1 block">메모 (선택)</label>
                <textarea
                  value={ex.note}
                  onChange={(e) => updateExercise(ex.id, (prev) => ({ ...prev, note: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="추가 설명"
                />
              </div>

              {errors.exercises?.[ex.id]?.summary && (
                <p className="text-sm text-red-600 mt-2">{errors.exercises[ex.id].summary}</p>
              )}
            </div>
          ))}

          <button
            onClick={addExercise}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            + 운동 추가
          </button>
        </section>

        {/* Save button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={save}
              disabled={isSaving}
              className={`w-full text-white rounded-full py-4 font-semibold text-lg shadow-lg transition-colors ${
                isSaving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  저장 중...
                </span>
              ) : (
                '수정 완료'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">수정 완료!</h2>
              <p className="text-slate-600">
                <span className="font-semibold text-blue-600">{title}</span> 프로그램이 수정되었습니다.
              </p>
            </div>
            <button
              onClick={() => router.push('/programs/manage')}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              프로그램 목록으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
