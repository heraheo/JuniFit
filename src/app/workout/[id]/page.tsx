"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Timer, Lock } from "lucide-react";
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
  
  // 순차 진행을 위한 현재 운동 인덱스
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  
  // 입력 오류 상태
  const [errors, setErrors] = useState<InputErrors>({});
  
  // 운동 완료 팝업 상태
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 휴식 타이머 상태
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  
  // 각 운동의 세트별 입력값 저장
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, SetInput[]>>({});
  
  // 운동 카드 참조 (스크롤용)
  const exerciseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    async function fetchProgram() {
      const resolvedParams = await params;
      const data = await getProgramById(resolvedParams.id);
      setProgram(data);
      
      if (data) {
        // 운동 세션 생성
        const session = await createWorkoutSession(resolvedParams.id);
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

  // 타이머 로직
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerOpen && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerOpen, remainingTime]);

  // 타이머 완료 처리
  const handleTimerComplete = () => {
    setIsTimerOpen(false);
    moveToNextExercise();
  };

  // 다음 운동으로 이동
  const moveToNextExercise = () => {
    if (!program) return;
    
    const nextIndex = currentExerciseIndex + 1;
    
    if (nextIndex >= program.exercises.length) {
      handleAllExercisesComplete();
    } else {
      setCurrentExerciseIndex(nextIndex);
      
      setTimeout(() => {
        const nextExercise = program.exercises[nextIndex];
        const ref = exerciseRefs.current[nextExercise.id];
        if (ref) {
          ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // 모든 운동 완료 처리
  const handleAllExercisesComplete = async () => {
    if (isSaving || !program) return;
    
    setIsSaving(true);
    
    try {
      // 인증 확인 추가
      const { data: { user }, error: authError } = await import('@/lib/supabase').then(m => m.supabase.auth.getUser());
      if (authError || !user) {
        alert("로그인이 필요합니다. 다시 로그인해주세요.");
        router.push('/login');
        return;
      }

      if (sessionId) {
        // 프로그램의 모든 운동과 세트를 저장 (입력 안 한 것은 0으로 저장)
        for (const exercise of program.exercises) {
          const inputs = exerciseInputs[exercise.id] || [];
          // target_sets만큼 모든 세트를 저장
          for (let i = 0; i < exercise.target_sets; i++) {
            const set = inputs[i];
            // 입력값이 있으면 그대로, 없으면 0으로 저장
            const weight = set?.weight.trim() !== '' ? parseFloat(set.weight) : 0;
            const reps = set?.reps.trim() !== '' ? parseInt(set.reps) : 0;
            
            const result = await saveWorkoutSet(
              sessionId,
              exercise.name,
              i + 1,
              weight,
              reps
            );
            
            if (!result) {
              throw new Error(`${exercise.name} ${i + 1}세트 저장 실패`);
            }
          }
        }
        
        const sessionResult = await completeWorkoutSession(sessionId);
        if (!sessionResult) {
          throw new Error('세션 완료 처리 실패');
        }
      }
      
      setIsSaving(false);
      setShowCompletionModal(true);
      
    } catch (error) {
      console.error('운동 기록 저장 실패:', error);
      setIsSaving(false);
      alert(`운동 기록 저장 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // 운동 완료 및 휴식 버튼 클릭
  const handleExerciseComplete = (exerciseIndex: number) => {
    if (!program) return;
    
    const exercise = program.exercises[exerciseIndex];
    const isLastExercise = exerciseIndex === program.exercises.length - 1;
    
    if (isLastExercise) {
      handleAllExercisesComplete();
    } else {
      const restTime = exercise.rest_seconds || 60;
      setTimerSeconds(restTime);
      setRemainingTime(restTime);
      setIsTimerOpen(true);
    }
  };

  // 타이머 스킵
  const handleTimerSkip = () => {
    setIsTimerOpen(false);
    moveToNextExercise();
  };

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  // 입력값 검증
  const validateInput = (value: string, field: 'weight' | 'reps'): string | null => {
    if (value.trim() === '') return null;
    
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
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) {
      return;
    }
    
    setExerciseInputs(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((set, idx) => 
        idx === setIndex ? { ...set, [field]: value } : set
      )
    }));

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

  // 현재 운동의 입력이 유효한지 확인
  const isCurrentExerciseValid = () => {
    if (!program) return false;
    const exercise = program.exercises[currentExerciseIndex];
    const inputs = exerciseInputs[exercise.id] || [];
    return inputs.some(set => set.weight.trim() !== '' && set.reps.trim() !== '');
  };

  // 진행률 계산
  const progressPercentage = ((currentExerciseIndex) / program.exercises.length) * 100;

  return (
    <div className="min-h-screen px-4 pt-6 pb-32 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center mb-4">
          <Link href="/workout" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{program.title}</h1>
            <p className="text-sm text-slate-600">{program.description}</p>
          </div>
        </header>

        {/* 진행 상태 바 */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">진행 상황</span>
            <span className="text-sm font-bold text-blue-600">
              {currentExerciseIndex + 1} / {program.exercises.length}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* 운동 목록 */}
        <section className="flex flex-col gap-4">
          {program.exercises.map((exercise, exerciseIndex) => {
            const isCompleted = exerciseIndex < currentExerciseIndex;
            const isCurrent = exerciseIndex === currentExerciseIndex;
            const isLocked = exerciseIndex > currentExerciseIndex;
            const isLastExercise = exerciseIndex === program.exercises.length - 1;

            return (
              <div 
                key={exercise.id}
                ref={(el) => { exerciseRefs.current[exercise.id] = el; }}
                className={`bg-white rounded-xl shadow-md transition-all duration-300 overflow-hidden ${
                  isCompleted ? "opacity-60" : ""
                } ${isCurrent ? "ring-2 ring-blue-500" : ""}`}
              >
                {/* 운동 헤더 */}
                <div
                  className={`p-4 transition-colors ${
                    isCompleted ? "bg-green-50" : 
                    isCurrent ? "bg-blue-50" : 
                    "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted ? "bg-green-500" :
                        isCurrent ? "bg-blue-500" :
                        "bg-gray-300"
                      }`}>
                        {isCompleted ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : isLocked ? (
                          <Lock className="w-4 h-4 text-white" />
                        ) : (
                          <span className="text-white font-bold text-sm">{exerciseIndex + 1}</span>
                        )}
                      </div>
                      
                      <div>
                        <h3 className={`font-semibold ${
                          isCompleted ? "text-green-800" : 
                          isCurrent ? "text-blue-800" : 
                          "text-slate-500"
                        }`}>
                          {exercise.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">
                            {exercise.target_sets}세트 × {exercise.target_reps}회
                          </span>
                          {exercise.rest_seconds && (
                            <>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500">
                                휴식 {exercise.rest_seconds}초
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 운동 입력 영역 (현재 운동만 펼침) */}
                {isCurrent && (
                  <div className="p-4 border-t border-gray-100">
                    {exercise.intention && (
                      <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                        <p className="text-sm text-yellow-800">
                          💡 {exercise.intention}
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      {Array.from({ length: exercise.target_sets }, (_, setIndex) => (
                        <div key={setIndex} className="grid grid-cols-[auto_1fr_1fr] gap-3 items-start">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-800">
                              {setIndex + 1}
                            </span>
                          </div>
                          
                          <div>
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
                            <label className="block text-xs text-center text-slate-500 mt-1">무게</label>
                          </div>

                          <div>
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
                            <label className="block text-xs text-center text-slate-500 mt-1">횟수</label>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 버튼 구분선 */}
                    <div className="mt-6 pt-5 border-t-2 border-dashed border-gray-200">
                      <button
                        onClick={() => handleExerciseComplete(exerciseIndex)}
                        disabled={!isCurrentExerciseValid() || isSaving}
                        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                          isCurrentExerciseValid() && !isSaving
                            ? isLastExercise
                              ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg ring-2 ring-green-300 ring-offset-2"
                              : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg ring-2 ring-blue-300 ring-offset-2"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          저장 중...
                        </>
                      ) : isLastExercise ? (
                        <>
                          <Check className="w-5 h-5" />
                          운동 완료!
                        </>
                      ) : (
                        <>
                          <Timer className="w-5 h-5" />
                          운동 완료 & 휴식 시작
                        </>
                      )}
                      </button>
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {exerciseInputs[exercise.id]?.map((set, idx) => (
                        set.weight && set.reps ? (
                          <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {idx + 1}세트: {set.weight}kg × {set.reps}회
                          </span>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* 오늘의 운동 완료하기 버튼 */}
        <div className="mt-8 pb-8">
          <button
            onClick={handleAllExercisesComplete}
            disabled={isSaving}
            className="w-full py-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-semibold text-lg transition-colors shadow-md flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                저장 중...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                오늘의 운동 완료하기
              </>
            )}
          </button>
          <p className="text-xs text-slate-500 text-center mt-2">
            현재까지 입력한 기록만 저장됩니다
          </p>
        </div>
      </div>

      {/* 휴식 타이머 모달 */}
      {isTimerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="mb-6">
              <Timer className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">휴식 시간</h2>
              <p className="text-slate-600">잠시 쉬고 다음 운동을 준비하세요</p>
            </div>
            
            <div className="mb-8">
              <div className="text-6xl font-bold text-blue-600 mb-6 text-center">
                {formatTime(remainingTime)}
              </div>
              
              <div className="flex justify-center">
                <svg width="160" height="160" className="transform -rotate-90">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="80" cy="80" r="70" fill="none" stroke="#3b82f6" strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 70}
                    strokeDashoffset={2 * Math.PI * 70 * (1 - remainingTime / timerSeconds)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
              </div>
            </div>

            {currentExerciseIndex + 1 < program.exercises.length && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">다음 운동</p>
                <p className="font-semibold text-slate-800">
                  {program.exercises[currentExerciseIndex + 1].name}
                </p>
              </div>
            )}

            <button
              onClick={handleTimerSkip}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md"
            >
              다음 운동 시작하기
            </button>
          </div>
        </div>
      )}

      {/* 운동 완료 팝업 */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">운동 완료!</h2>
              <p className="text-slate-600">오늘도 수고하셨습니다</p>
            </div>

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
                              <span className="text-slate-800">{set.weight || '0'}kg × {set.reps || '0'}회</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-4 py-3 text-slate-600 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                대시보드 보기
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                홈으로 이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}