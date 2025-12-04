"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { getProgramById, createWorkoutSession, saveWorkoutSet, completeWorkoutSession } from "@/lib/api";
import type { ProgramWithExercises } from "@/lib/api";

// 동적 라우트를 위한 params 타입 정의
type Props = {
  params: Promise<{ id: string }>;
};

type SetInput = {
  weight: string;
  reps: string;
};

type InputErrors = {
  [exerciseId: string]: {
    [setIndex: number]: {
      weight?: string;
      reps?: string;
    };
  };
};

export default function WorkoutDetailPage({ params }: Props) {
  const router = useRouter();
  const [program, setProgram] = useState<ProgramWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // 각 운동의 접힘/펼침 상태 (첫 번째 운동만 기본적으로 펼쳐짐)
  const [expandedExercise, setExpandedExercise] = useState<string>("");
  
  // 입력 오류 상태
  const [errors, setErrors] = useState<InputErrors>({});
  
  // 운동 완료 팝업 상태
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 각 운동의 세트별 입력값 저장
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, SetInput[]>>({});

  useEffect(() => {
    async function fetchProgram() {
      const resolvedParams = await params;
      const data = await getProgramById(resolvedParams.id);
      setProgram(data);
      
      if (data) {
        // 첫 번째 운동을 펼침
        setExpandedExercise(data.exercises[0]?.id || "");
        
        // 운동 세션 생성
        const session = await createWorkoutSession(params.id);
        if (session) {
          setSessionId(session.id);
        }
        
        // 입력값 초기화
        const initialInputs: Record<string, SetInput[]> = {};
        data.exercises.forEach((exercise) => {
          initialInputs[exercise.id] = Array(exercise.target_sets).fill(null).map(() => ({
            weight: "",
            reps: "",
          }));
        });
        setExerciseInputs(initialInputs);
      }
      
      setLoading(false);
    }
    fetchProgram();
  }, [params]);

  if (!program) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
        <div className="max-w-md mx-auto">
          <header className="flex items-center mb-6">
            <Link href="/workout" className="text-slate-600 mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">
              {loading ? "로딩 중..." : "프로그램을 찾을 수 없습니다"}
            </h1>
          </header>
          {!loading && (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <p className="text-slate-600 mb-4">요청하신 프로그램을 찾을 수 없습니다.</p>
              <Link 
                href="/workout"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                프로그램 목록으로 돌아가기
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 특정 운동의 모든 세트가 완료되었는지 확인
  const isExerciseCompleted = (exerciseId: string) => {
    const inputs = exerciseInputs[exerciseId] || [];
    return inputs.every((set) => set.weight.trim() !== "" && set.reps.trim() !== "");
  };

  // 입력 검증 함수
  const validateInput = (value: string, field: 'weight' | 'reps'): string | null => {
    if (value.trim() === '') return null; // 빈 값은 오류가 아님
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return field === 'weight' ? '무게는 양수여야 합니다' : '횟수는 양의 정수여야 합니다';
    }
    
    if (field === 'reps' && !Number.isInteger(numValue)) {
      return '횟수는 정수여야 합니다';
    }
    
    return null;
  };

  // 세트 입력값 업데이트
  const updateSetInput = (exerciseId: string, setIndex: number, field: keyof SetInput, value: string) => {
    // 숫자만 입력 가능하도록 필터링
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) {
      return; // 숫자가 아닌 경우 업데이트하지 않음
    }
    
    setExerciseInputs(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((set, idx) => 
        idx === setIndex ? { ...set, [field]: value } : set
      )
    }));

    // 실시간 검증
    const error = validateInput(value, field);
    setErrors(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [setIndex]: {
          ...prev[exerciseId]?.[setIndex],
          [field]: error,
        },
      },
    }));
  };

  // 운동 카드 토글 (완료된 운동은 접히고 다음 운동이 펼쳐짐)
  const toggleExercise = (exerciseId: string) => {
    if (expandedExercise === exerciseId) {
      setExpandedExercise("");
    } else {
      setExpandedExercise(exerciseId);
    }
  };

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/workout" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{program.title}</h1>
            <p className="text-sm text-slate-600">{program.description}</p>
          </div>
        </header>

        {/* 운동 목록 */}
        <section className="flex flex-col gap-8">
          {program.exercises.map((exercise, exerciseIndex) => {
            const isCompleted = isExerciseCompleted(exercise.id);
            const isExpanded = expandedExercise === exercise.id;

            return (
              <div 
                key={exercise.id} 
                className={`bg-white rounded-xl shadow-md transition-all duration-300 ${
                  isCompleted ? "opacity-70 bg-green-50" : ""
                }`}
              >
                {/* 운동 헤더 */}
                <div
                  className={`p-6 cursor-pointer transition-colors ${
                    isCompleted ? "bg-green-100" : "hover:bg-gray-50"
                  }`}
                  onClick={() => toggleExercise(exercise.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isCompleted ? "text-green-800" : "text-slate-800"}`}>
                        {exerciseIndex + 1}. {exercise.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-slate-600">
                          {exercise.target_sets}세트
                        </span>
                        <span className="text-sm text-slate-600">
                          {exercise.target_reps}회
                        </span>
                        <span className="text-sm text-slate-600">
                          휴식 {exercise.rest_seconds}초
                        </span>
                      </div>
                      {exercise.intention && (
                        <p className="text-xs text-blue-600 mt-1">{exercise.intention}</p>
                      )}
                    </div>
                    <div className="ml-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 운동 상세 (접이식) */}
                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="space-y-5 mt-6">
                      {Array.from({ length: exercise.target_sets }, (_, setIndex) => (
                        <div key={setIndex} className="grid grid-cols-[auto_1fr_1fr] gap-4 items-start">
                          {/* 세트 번호 */}
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-2">
                            <span className="text-sm font-medium text-blue-800">
                              {setIndex + 1}
                            </span>
                          </div>
                          
                          {/* 무게 입력 */}
                          <div className="flex-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="kg"
                              value={exerciseInputs[exercise.id]?.[setIndex]?.weight || ""}
                              onChange={(e) => updateSetInput(exercise.id, setIndex, "weight", e.target.value)}
                              className={`w-full p-3 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
                                errors[exercise.id]?.[setIndex]?.weight
                                  ? "border-red-300 focus:ring-red-500"
                                  : "border-gray-300 focus:ring-blue-500"
                              }`}
                            />
                            <label className="block text-xs text-center text-slate-500 mt-1">
                              무게
                            </label>
                            {errors[exercise.id]?.[setIndex]?.weight && (
                              <p className="text-xs text-red-500 text-center mt-1">
                                {errors[exercise.id][setIndex].weight}
                              </p>
                            )}
                          </div>

                          {/* 횟수 입력 */}
                          <div className="flex-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="회"
                              value={exerciseInputs[exercise.id]?.[setIndex]?.reps || ""}
                              onChange={(e) => updateSetInput(exercise.id, setIndex, "reps", e.target.value)}
                              className={`w-full p-3 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
                                errors[exercise.id]?.[setIndex]?.reps
                                  ? "border-red-300 focus:ring-red-500"
                                  : "border-gray-300 focus:ring-blue-500"
                              }`}
                            />
                            <label className="block text-xs text-center text-slate-500 mt-1">
                              횟수
                            </label>
                            {errors[exercise.id]?.[setIndex]?.reps && (
                              <p className="text-xs text-red-500 text-center mt-1">
                                {errors[exercise.id][setIndex].reps}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 완료 상태 표시 */}
                    {isCompleted && (
                      <div className="mt-4 p-2 bg-green-100 rounded-lg text-center">
                        <span className="text-green-800 font-medium text-sm">✓ 완료</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* 운동 완료 버튼 */}
        <div className="mt-8">
          <button 
            disabled={isSaving}
            className={`w-full text-white rounded-full py-4 font-semibold text-lg shadow-lg transition-colors ${
              isSaving 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={async () => {
              if (isSaving) return;

              // 입력 오류 체크
              const hasErrors = Object.values(errors).some(exerciseErrors =>
                Object.values(exerciseErrors).some(setErrors =>
                  setErrors.weight || setErrors.reps
                )
              );
              
              if (hasErrors) {
                alert("입력 오류를 수정해주세요.");
                return;
              }

              setIsSaving(true);
              
              try {
                // 운동 기록 저장
                if (sessionId && program) {
                  console.log('운동 기록 저장 시작...');
                  
                  for (const exercise of program.exercises) {
                    const inputs = exerciseInputs[exercise.id] || [];
                    for (let i = 0; i < inputs.length; i++) {
                      const set = inputs[i];
                      if (set.weight.trim() !== '' && set.reps.trim() !== '') {
                        const result = await saveWorkoutSet(
                          sessionId,
                          exercise.name,
                          i + 1,
                          parseFloat(set.weight),
                          parseInt(set.reps)
                        );
                        
                        if (!result) {
                          throw new Error(`${exercise.name} ${i + 1}세트 저장 실패`);
                        }
                        
                        console.log(`${exercise.name} ${i + 1}세트 저장 완료`);
                      }
                    }
                  }
                  
                  // 세션 완료 처리
                  console.log('세션 완료 처리 중...');
                  const sessionResult = await completeWorkoutSession(sessionId);
                  
                  if (!sessionResult) {
                    throw new Error('세션 완료 처리 실패');
                  }
                  
                  console.log('모든 운동 기록 저장 완료!');
                }
                
                setIsSaving(false);
                // 운동 완료 팝업 표시
                setShowCompletionModal(true);
                
              } catch (error) {
                console.error('운동 기록 저장 실패:', error);
                setIsSaving(false);
                alert(`운동 기록 저장 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : '알 수 없는 오류'}`);
              }
            }}
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
              '운동 완료'
            )}
          </button>
        </div>

        {/* 운동 완료 팝업 */}
        {showCompletionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎉</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">운동 완료!</h2>
                <p className="text-slate-600">오늘도 수고하셨습니다</p>
              </div>

              {/* 운동 기록 요약 */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-800 mb-3">오늘의 운동 기록</h3>
                <div className="space-y-3">
                  {program?.exercises.map((exercise) => {
                    const inputs = exerciseInputs[exercise.id] || [];
                    const completedSets = inputs.filter(set => set.weight.trim() !== '' && set.reps.trim() !== '');
                    
                    if (completedSets.length === 0) return null;
                    
                    return (
                      <div key={exercise.id} className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-slate-700 mb-2">{exercise.name}</h4>
                        <div className="space-y-1">
                          {inputs.map((set, index) => {
                            if (set.weight.trim() === '' && set.reps.trim() === '') return null;
                            
                            return (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-slate-600">{index + 1}세트</span>
                                <span className="text-slate-800">
                                  {set.weight || '0'}kg × {set.reps || '0'}회
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="flex-1 px-4 py-3 text-slate-600 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  계속 운동하기
                </button>
                <button
                  onClick={() => {
                    console.log("운동 기록:", exerciseInputs);
                    router.push('/');
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  홈으로 이동
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}