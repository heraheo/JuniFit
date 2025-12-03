"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash } from "lucide-react";

type Exercise = {
  id: string;
  name: string;
  target: { sets: number; reps: { min: number; max: number } };
  restSeconds: number;
  intention: string;
  note: string;
};

type ExerciseInput = {
  id: string;
  name: string;
  target: { sets: number | string; reps: { min: number | string; max: number | string } };
  restSeconds: number | string;
  intention: string;
  note: string;
};

export default function Page() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<ExerciseInput[]>([
    { id: String(Date.now()), name: "", target: { sets: "", reps: { min: "", max: "" } }, restSeconds: "", intention: "", note: "" },
  ]);
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    exercises?: Record<string, { summary?: string }>;
  }>({});
  const [exercisesError, setExercisesError] = useState<string>("");
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), name: "", target: { sets: "", reps: { min: "", max: "" } }, restSeconds: "", intention: "", note: "" },
    ]);
  };

  const updateExercise = (id: string, updater: (ex: ExerciseInput) => ExerciseInput) => {
    setExercises((prev) => prev.map((ex) => (ex.id === id ? updater(ex) : ex)));
  };


  // Helper: returns summary message of missing required fields for an exercise, or undefined
  const getMissingSummary = (ex: ExerciseInput, idx: number) => {
    const missing: string[] = [];
    if (!ex.name.trim()) missing.push("운동명");
    if (ex.target.sets === "" || Number(ex.target.sets) < 1) missing.push("세트 수");
    if (ex.target.reps.min === "" || ex.target.reps.max === "") missing.push("횟수(최소/최대)");
    if (ex.restSeconds === "" || Number(ex.restSeconds) < 0) missing.push("휴식 시간(초)");
    if (missing.length === 0) return undefined;
    return `${missing.join(", ")}을 입력해주세요`;
  };

  const clearError = (exerciseId?: string) => {
    if (!exerciseId) return;
    setErrors((e) => {
      if (!e.exercises) return e;
      const copy = { ...e.exercises };
      if (copy[exerciseId]) {
        delete copy[exerciseId];
      }
      return { ...e, exercises: Object.keys(copy).length ? copy : undefined };
    });
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
    // remove any errors for this exercise
    setErrors((e) => {
      if (!e.exercises) return e;
      const copy = { ...e.exercises };
      delete copy[id];
      return { ...e, exercises: Object.keys(copy).length ? copy : undefined };
    });
  };

  const validate = () => {
    // keep for backward compatibility but prefer computeErrors()
    const computed = computeErrors();
    setErrors(computed);
    const hasErrors = Boolean(computed.title || computed.description || (computed.exercises && Object.keys(computed.exercises).length > 0));
    return { ok: !hasErrors };
  };

  // Compute errors from current form state but do not set state
  const computeErrors = (): typeof errors => {
    const newErrors: typeof errors = {};
    const titleMissing = !title.trim();
    const descMissing = !description.trim();
    if (titleMissing) newErrors.title = "프로그램 제목을 입력하세요.";
    if (descMissing) newErrors.description = "전체 가이드를 입력하세요.";

    // Check if at least one exercise exists with all required fields
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

    // At least one valid exercise is required
    if (!hasValidExercise) {
      setExercisesError("적어도 하나의 운동을 추가해야 합니다.");
      return newErrors;
    } else {
      setExercisesError("");
    }

    return newErrors;
  };

  const save = async () => {
    // Check for input errors first
    const hasInputErrors = Object.keys(inputErrors).length > 0;
    if (hasInputErrors) {
      alert("입력 오류를 먼저 수정해주세요.");
      return;
    }

    // Recompute errors on every save attempt
    const computed = computeErrors();
    setErrors(computed);
    const hasErrors = Boolean(computed.title || computed.description || (computed.exercises && Object.keys(computed.exercises).length > 0) || exercisesError);
    if (hasErrors) {
      alert("필수 입력란을 모두 채워주세요.");
      return;
    }

    try {
      // Step 1: programs 테이블에 부모 데이터 저장
      // TODO: Supabase 연결 후 아래 코드 활성화
      /*
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .insert({
          title: title.trim(),
          description: description.trim(),
        })
        .select()
        .single();

      if (programError) throw programError;
      if (!programData) throw new Error('프로그램 저장에 실패했습니다.');

      const programId = programData.id;
      */

      // 임시: DB 연결 전 시뮬레이션
      const programId = `prog_${Date.now()}`;
      console.log('Step 1: Program saved', { id: programId, title, description });

      // Step 2: UI 상태를 DB 포맷으로 변환
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
          target_reps: Number(ex.target.reps.min), // min을 기본값으로 사용
          rest_seconds: Number(ex.restSeconds),
          intention: ex.intention?.trim() || null,
          note: ex.note?.trim() || null,
          order: index,
        }));

      console.log('Step 2: Exercises converted', programExercises);

      // Step 3: program_exercises 테이블에 일괄 저장
      // TODO: Supabase 연결 후 아래 코드 활성화
      /*
      const { error: exercisesError } = await supabase
        .from('program_exercises')
        .insert(programExercises);

      if (exercisesError) throw exercisesError;
      */

      console.log('Step 3: Exercises saved to DB');

      // 성공 메시지
      alert(`프로그램이 성공적으로 저장되었습니다!\n\n제목: ${title}\n운동 개수: ${programExercises.length}개`);
      
      // 메인 페이지로 이동
      router.push("/");

    } catch (error) {
      console.error('Save error:', error);
      alert(`저장 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  return (
    <div className="min-h-screen pb-32 px-4 pt-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="grid grid-cols-3 items-center mb-6">
          <div className="text-left">
            <Link href="/" className="text-slate-600">
              ← 뒤로가기
            </Link>
          </div>
          <h1 className="text-lg font-semibold text-center">새 프로그램 만들기</h1>
          <div />
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
        <section className="space-y-4">
          {exercises.map((ex, i) => (
            <div key={ex.id} className="bg-white rounded-xl shadow-md p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex-1">
                  <input
                    value={ex.name}
                    onChange={(e) => {
                      const newEx = { ...ex, name: e.target.value };
                      updateExercise(ex.id, () => newEx);
                    }}
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="운동명"
                  />
                </div>
                <button
                  onClick={() => removeExercise(ex.id)}
                  className="text-red-500 p-2 rounded-md hover:bg-red-50"
                  aria-label="삭제"
                  title="운동 삭제"
                >
                  <Trash className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">세트 수</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={ex.target.sets === "" ? "" : String(ex.target.sets)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const errorKey = `${ex.id}-sets`;
                      
                      if (val === "") {
                        setInputErrors(prev => { const copy = {...prev}; delete copy[errorKey]; return copy; });
                        const newEx = { ...ex, target: { ...ex.target, sets: "" } };
                        updateExercise(ex.id, () => newEx);
                      } else if (/^\d+$/.test(val) && Number(val) >= 1) {
                        setInputErrors(prev => { const copy = {...prev}; delete copy[errorKey]; return copy; });
                        const newEx = { ...ex, target: { ...ex.target, sets: Number(val) } };
                        updateExercise(ex.id, () => newEx);
                      } else {
                        setInputErrors(prev => ({ ...prev, [errorKey]: "1 이상의 숫자를 입력해주세요" }));
                      }
                    }}
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                      inputErrors[`${ex.id}-sets`] ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                    }`}
                    placeholder="예: 3"
                  />
                  {inputErrors[`${ex.id}-sets`] && (
                    <p className="text-sm text-red-600 mt-1">{inputErrors[`${ex.id}-sets`]}</p>
                  )}

                  <label className="block text-sm font-medium text-slate-700 mb-1 mt-3">목표 횟수</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={ex.target.reps.min === "" ? "" : String(ex.target.reps.min)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const errorKey = `${ex.id}-reps-min`;
                          
                          if (val === "") {
                            setInputErrors(prev => { const copy = {...prev}; delete copy[errorKey]; return copy; });
                            const newEx = { ...ex, target: { ...ex.target, reps: { ...ex.target.reps, min: "" } } };
                            updateExercise(ex.id, () => newEx);
                          } else if (/^\d+$/.test(val) && Number(val) > 0) {
                            // Always update the value first
                            const minVal = Number(val);
                            const newEx = { ...ex, target: { ...ex.target, reps: { ...ex.target.reps, min: minVal } } };
                            updateExercise(ex.id, () => newEx);
                            
                            // Then check validation
                            const maxVal = ex.target.reps.max;
                            if (maxVal !== "" && minVal > Number(maxVal)) {
                              setInputErrors(prev => ({ ...prev, [errorKey]: "최소값은 최대값보다 작거나 같아야 합니다" }));
                            } else {
                              setInputErrors(prev => { const copy = {...prev}; delete copy[errorKey]; return copy; });
                            }
                          } else {
                            setInputErrors(prev => ({ ...prev, [errorKey]: "1 이상의 숫자를 입력해주세요" }));
                          }
                        }}
                        className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          inputErrors[`${ex.id}-reps-min`] ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                        }`}
                        placeholder="최소 (예: 8)"
                      />
                      {inputErrors[`${ex.id}-reps-min`] && (
                        <p className="text-sm text-red-600 mt-1">{inputErrors[`${ex.id}-reps-min`]}</p>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={ex.target.reps.max === "" ? "" : String(ex.target.reps.max)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const errorKey = `${ex.id}-reps-max`;
                          
                          if (val === "") {
                            setInputErrors(prev => { const copy = {...prev}; delete copy[errorKey]; return copy; });
                            const newEx = { ...ex, target: { ...ex.target, reps: { ...ex.target.reps, max: "" } } };
                            updateExercise(ex.id, () => newEx);
                          } else if (/^\d+$/.test(val) && Number(val) > 0) {
                            // Always update the value first
                            const maxVal = Number(val);
                            const newEx = { ...ex, target: { ...ex.target, reps: { ...ex.target.reps, max: maxVal } } };
                            updateExercise(ex.id, () => newEx);
                            
                            // Then check validation
                            const minVal = ex.target.reps.min;
                            if (minVal !== "" && Number(minVal) > maxVal) {
                              setInputErrors(prev => ({ ...prev, [errorKey]: "최대값은 최소값보다 크거나 같아야 합니다" }));
                            } else {
                              setInputErrors(prev => { const copy = {...prev}; delete copy[errorKey]; return copy; });
                            }
                          } else {
                            setInputErrors(prev => ({ ...prev, [errorKey]: "1 이상의 숫자를 입력해주세요" }));
                          }
                        }}
                        className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          inputErrors[`${ex.id}-reps-max`] ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                        }`}
                        placeholder="최대 (예: 12)"
                      />
                      {inputErrors[`${ex.id}-reps-max`] && (
                        <p className="text-sm text-red-600 mt-1">{inputErrors[`${ex.id}-reps-max`]}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">휴식 시간</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={ex.restSeconds === "" ? "" : String(ex.restSeconds)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const errorKey = `${ex.id}-rest`;
                      
                      if (val === "") {
                        setInputErrors(prev => { const copy = {...prev}; delete copy[errorKey]; return copy; });
                        const newEx = { ...ex, restSeconds: "" };
                        updateExercise(ex.id, () => newEx);
                      } else if (/^\d+$/.test(val) && Number(val) >= 0) {
                        setInputErrors(prev => { const copy = {...prev}; delete copy[errorKey]; return copy; });
                        const newEx = { ...ex, restSeconds: Number(val) };
                        updateExercise(ex.id, () => newEx);
                      } else {
                        setInputErrors(prev => ({ ...prev, [errorKey]: "0 이상의 숫자를 입력해주세요" }));
                      }
                    }}
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                      inputErrors[`${ex.id}-rest`] ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                    }`}
                    placeholder="초 단위 (예: 60)"
                  />
                  {inputErrors[`${ex.id}-rest`] && (
                    <p className="text-sm text-red-600 mt-1">{inputErrors[`${ex.id}-rest`]}</p>
                  )}

                  <label className="block text-sm font-medium text-slate-700 mb-1 mt-3">운동 의도</label>
                  <input
                    value={ex.intention}
                    onChange={(e) => updateExercise(ex.id, (prev) => ({ ...prev, intention: e.target.value }))}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 근력 향상, 근비대 등"
                  />
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700 mb-1">비고</label>
              <textarea
                value={ex.note}
                onChange={(e) => updateExercise(ex.id, (prev) => ({ ...prev, note: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="추가 설명이나 주의사항을 입력하세요"
              />
              {errors.exercises?.[ex.id]?.summary && (
                <p className="text-sm text-red-600 mt-3">{errors.exercises[ex.id].summary}</p>
              )}
            </div>
          ))}

          <button onClick={addExercise} className="w-full bg-blue-600 text-white rounded-lg py-3">
            + 운동 추가하기
          </button>
          {exercisesError && (
            <p className="text-sm text-red-600 mt-3 text-center">{exercisesError}</p>
          )}
        </section>
      </div>

      {/* Save button - sticky bottom */}
      <div className="fixed left-0 right-0 bottom-4 flex justify-center">
        <button onClick={save} className="w-full max-w-md bg-green-600 text-white rounded-full py-3 mx-4 shadow-lg">
          저장하기
        </button>
      </div>
    </div>
  );
}
