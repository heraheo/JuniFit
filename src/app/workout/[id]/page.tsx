"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Timer, Lock } from "lucide-react";
import { getProgramById, createWorkoutSession } from "@/lib/api";
import type { ProgramWithExercises } from "@/lib/api";
import { formatSeconds } from "@/lib/utils";
import { useRestTimer } from "@/hooks/useRestTimer";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import Button from "@/components/ui/Button";


// 동적 라우트를 위한 params 타입 정의
type Props = {
  params: Promise<{ id: string }>;
};

export default function WorkoutDetailPage({ params }: Props) {
  const router = useRouter();
  const [program, setProgram] = useState<ProgramWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // 운동 카드 참조 (스크롤용)
  const exerciseRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // 세션 관리 훅
  const session = useWorkoutSession({
    program,
    sessionId,
    onComplete: () => {
      if (program) {
        const exercise = program.exercises[session.currentIndex];
        const restTime = exercise.rest_seconds || 60;
        timer.start(restTime);
      }
    },
    exerciseRefs,
  });
  
  // 휴식 타이머 훅
  const timer = useRestTimer(() => session.actions.moveToNext());

  useEffect(() => {
    async function fetchProgram() {
      const resolvedParams = await params;
      const data = await getProgramById(resolvedParams.id);
      setProgram(data);
      
      if (data) {
        // 운동 세션 생성
        const workoutSession = await createWorkoutSession(resolvedParams.id);
        if (workoutSession) {
          setSessionId(workoutSession.id);
        }
        
        // 입력값 초기화
        session.actions.initializeInputs(data);
      }
      
      setLoading(false);
    }
    fetchProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <Link href="/workout">
                <Button variant="primary">
                  프로그램 목록으로 돌아가기
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 진행률 계산
  const progressPercentage = ((session.currentIndex) / program.exercises.length) * 100;

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
              {session.currentIndex + 1} / {program.exercises.length}
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
            const isCompleted = exerciseIndex < session.currentIndex;
            const isCurrent = exerciseIndex === session.currentIndex;
            const isLocked = exerciseIndex > session.currentIndex;
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
                              value={session.inputs[exercise.id]?.[setIndex]?.weight || ""}
                              onChange={(e) => session.actions.updateInput(exercise.id, setIndex, "weight", e.target.value)}
                              className={`w-full p-3 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
                                session.errors[exercise.id]?.[setIndex]?.weight
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
                              value={session.inputs[exercise.id]?.[setIndex]?.reps || ""}
                              onChange={(e) => session.actions.updateInput(exercise.id, setIndex, "reps", e.target.value)}
                              className={`w-full p-3 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
                                session.errors[exercise.id]?.[setIndex]?.reps
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
                      <Button
                        onClick={() => session.actions.completeExercise(exerciseIndex)}
                        disabled={!session.actions.isCurrentValid()}
                        isLoading={session.isSaving}
                        fullWidth
                        size="lg"
                        className={isLastExercise ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg ring-2 ring-green-300 ring-offset-2" : "shadow-lg ring-2 ring-blue-300 ring-offset-2"}
                      >
                        {isLastExercise ? (
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
                      </Button>
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {session.inputs[exercise.id]?.map((set, idx) => (
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
          <Button
            onClick={session.actions.completeAll}
            isLoading={session.isSaving}
            fullWidth
            size="lg"
            variant="secondary"
            className="shadow-md"
          >
            <Check className="w-5 h-5" />
            오늘의 운동 완료하기
          </Button>
          <p className="text-xs text-slate-500 text-center mt-2">
            현재까지 입력한 기록만 저장됩니다
          </p>
        </div>
      </div>

      {/* 휴식 타이머 모달 */}
      {timer.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="mb-6">
              <Timer className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">휴식 시간</h2>
              <p className="text-slate-600">잠시 쉬고 다음 운동을 준비하세요</p>
            </div>
            
            <div className="mb-8">
              <div className="text-6xl font-bold text-blue-600 mb-6 text-center">
                {formatSeconds(timer.remaining)}
              </div>
              
              <div className="flex justify-center">
                <svg width="160" height="160" className="transform -rotate-90">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="80" cy="80" r="70" fill="none" stroke="#3b82f6" strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 70}
                    strokeDashoffset={2 * Math.PI * 70 * (1 - timer.remaining / timer.total)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
              </div>
            </div>

            {session.currentIndex + 1 < program.exercises.length && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">다음 운동</p>
                <p className="font-semibold text-slate-800">
                  {program.exercises[session.currentIndex + 1].name}
                </p>
              </div>
            )}

            <Button
              onClick={timer.skip}
              fullWidth
              size="lg"
              variant="primary"
              className="shadow-md"
            >
              다음 운동 시작하기
            </Button>
          </div>
        </div>
      )}

      {/* 운동 완료 팝업 */}
      {session.showCompletionModal && (
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
                  const inputs = session.inputs[exercise.id] || [];
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
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="flex-1"
              >
                대시보드 보기
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="primary"
                className="flex-1"
              >
                홈으로 이동
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}