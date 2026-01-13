"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Timer, Lock, SkipForward } from "lucide-react";
import { getProgramById, createWorkoutSession } from "@/lib/api";
import type { ProgramWithExercises } from "@/lib/api";
import { formatSeconds, formatDurationSeconds } from "@/lib/utils";
import { useRestTimer } from "@/hooks/useRestTimer";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";


// 동적 라우트를 위한 params 타입 정의
type Props = {
  params: Promise<{ id: string }>;
};

export default function WorkoutDetailPage({ params }: Props) {
  const router = useRouter();
  const [program, setProgram] = useState<ProgramWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // 운동 카드 참조 (스크롤용)
  const exerciseRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // 휴식 타이머 훅 (세트 간 휴식용)
  const timer = useRestTimer(() => {
    // 타이머 종료 시 아무 동작 안 함
  });
  
  // 세션 관리 훅
  const session = useWorkoutSession({
    program,
    sessionId,
    onSetComplete: (restSeconds: number) => {
      // 세트 완료 시 타이머 시작
      timer.start(restSeconds);
    },
    exerciseRefs,
  });

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
            <Card padding="lg" className="text-center">
              <p className="text-slate-600 mb-4">요청하신 프로그램을 찾을 수 없습니다.</p>
              <Link href="/workout">
                <Button variant="primary">
                  프로그램 목록으로 돌아가기
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // 진행률 계산
  const progressPercentage = ((session.currentIndex) / program.exercises.length) * 100;
  const currentExercise = program.exercises[session.currentIndex];
  const isLastExercise = session.currentIndex === program.exercises.length - 1;

  // 다음 운동 버튼 클릭 핸들러
  const handleNextButtonClick = () => {
    if (session.actions.isCurrentValid()) {
      // 완료된 세트가 있으면 바로 넘어감
      session.actions.moveToNextExercise();
    } else if (session.actions.hasIncompleteSets()) {
      // 완료된 세트가 없고 미완료 세트가 있으면 팝업
      setShowSkipConfirm(true);
    } else {
      // 완료된 세트도 없고 미완료 세트도 없으면 바로 넘어감
      session.actions.moveToNextExercise();
    }
  };

  // 미완료 세트 확인 및 다음 운동으로 이동
  const confirmSkipAndMoveNext = () => {
    session.actions.completeRemainingSets();
    session.actions.moveToNextExercise();
    setShowSkipConfirm(false);
  };

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
            {program.rpe && (
              <p className="text-sm text-blue-600 font-medium mt-1">
                RPE: {program.rpe}
              </p>
            )}
            {!program.rpe && (
              <p className="text-sm text-gray-400 mt-1">
                RPE: 없음
              </p>
            )}
          </div>
        </header>

        {/* 진행 상태 바 */}
        <Card padding="sm" className="mb-6">
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
        </Card>

        {/* 운동 목록 */}
        <section className="flex flex-col gap-4 mb-6">
          {program.exercises.map((exercise, exerciseIndex) => {
            const isCompleted = exerciseIndex < session.currentIndex;
            const isCurrent = exerciseIndex === session.currentIndex;
            const isLocked = exerciseIndex > session.currentIndex;

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
                           {exercise.record_type === 'time' ? (
                             <span className="text-xs text-slate-500">
                               {exercise.target_sets}세트 × {formatDurationSeconds(exercise.target_time)}
                             </span>
                           ) : exercise.record_type === 'reps_only' ? (
                             <span className="text-xs text-slate-500">
                               {exercise.target_sets}세트 × {exercise.target_reps}회
                             </span>
                           ) : (
                             <span className="text-xs text-slate-500">
                               {exercise.target_sets}세트 × {exercise.target_reps}회
                             </span>
                           )}
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
                    <div className="space-y-3">
                      {Array.from({ length: exercise.target_sets || 0 }, (_, setIndex) => {
                        const setData = session.inputs[exercise.id]?.[setIndex];
                        const isSetCompleted = setData?.completed || false;
                        const recordType = exercise.record_type;

                        return (
                          <div
                            key={setIndex}
                            className={`grid grid-cols-[auto_1fr_auto] gap-3 items-center p-3 rounded-lg transition-all ${
                              isSetCompleted ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isSetCompleted ? 'bg-green-500' : 'bg-blue-100'
                            }`}>
                              <span className={`text-sm font-bold ${
                                isSetCompleted ? 'text-white' : 'text-blue-800'
                              }`}>
                                {setIndex + 1}
                              </span>
                            </div>

                            {recordType === 'weight_reps' && (
                              <>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="kg"
                                      value={setData?.weight || ""}
                                      onChange={(e) => session.actions.updateInput(exercise.id, setIndex, "weight", e.target.value)}
                                      disabled={isSetCompleted}
                                      className={`w-full p-2 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
                                        isSetCompleted
                                          ? 'bg-white border-green-300 text-green-800'
                                          : session.errors[exercise.id]?.[setIndex]?.weight
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
                                      value={setData?.reps || ""}
                                      onChange={(e) => session.actions.updateInput(exercise.id, setIndex, "reps", e.target.value)}
                                      disabled={isSetCompleted}
                                      className={`w-full p-2 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
                                        isSetCompleted
                                          ? 'bg-white border-green-300 text-green-800'
                                          : session.errors[exercise.id]?.[setIndex]?.reps
                                          ? "border-red-300 focus:ring-red-500"
                                          : "border-gray-300 focus:ring-blue-500"
                                      }`}
                                    />
                                    <label className="block text-xs text-center text-slate-500 mt-1">횟수</label>
                                  </div>
                                </div>
                              </>
                            )}

                            {recordType === 'reps_only' && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="회"
                                    value={setData?.reps || ""}
                                    onChange={(e) => session.actions.updateInput(exercise.id, setIndex, "reps", e.target.value)}
                                    disabled={isSetCompleted}
                                    className={`w-full p-2 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
                                      isSetCompleted
                                        ? 'bg-white border-green-300 text-green-800'
                                        : session.errors[exercise.id]?.[setIndex]?.reps
                                        ? "border-red-300 focus:ring-red-500"
                                        : "border-gray-300 focus:ring-blue-500"
                                    }`}
                                  />
                                  <label className="block text-xs text-center text-slate-500 mt-1">횟수</label>
                                </div>
                              </div>
                            )}

                            {recordType === 'time' && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="초"
                                    value={setData?.time || ""}
                                    onChange={(e) => session.actions.updateInput(exercise.id, setIndex, "time", e.target.value)}
                                    disabled={isSetCompleted}
                                    className={`w-full p-2 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
                                      isSetCompleted
                                        ? 'bg-white border-green-300 text-green-800'
                                        : session.errors[exercise.id]?.[setIndex]?.time
                                        ? "border-red-300 focus:ring-red-500"
                                        : "border-gray-300 focus:ring-blue-500"
                                    }`}
                                  />
                                  <label className="block text-xs text-center text-slate-500 mt-1">시간(초)</label>
                                </div>
                              </div>
                            )}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => session.actions.toggleSetComplete(exercise.id, setIndex)}
                                  className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                                    isSetCompleted
                                      ? 'bg-green-500 hover:bg-green-600 text-white'
                                      : 'bg-white border-2 border-blue-500 hover:bg-blue-50 text-slate-700'
                                  }`}
                                  title={isSetCompleted ? '완료 취소' : '세트 완료'}
                                >
                                  <Check className="w-5 h-5" />
                                  <span className="text-sm font-medium">{isSetCompleted ? '완료' : '완료'}</span>
                                </button>

                                {!isSetCompleted && (
                                  <button
                                    onClick={() => {
                                      // 완료 처리 없이 바로 다음 세트로 이동
                                      session.actions.moveToNextExercise();
                                    }}
                                    className="p-2 rounded-lg transition-all bg-white border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                    title="세트 건너뛰기"
                                  >
                                    <SkipForward className="w-5 h-5" />
                                    <span className="text-sm font-medium">건너뛰기</span>
                                  </button>
                                )}
                              </div>
                           </div>
                        );
                      })}
                    </div>

                    {/* 메모 입력 영역 */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        운동 메모
                      </label>
                      <textarea
                        placeholder="이 운동에 대한 메모를 입력하세요 (선택사항)"
                        value={session.notes[exercise.id] || ""}
                        onChange={(e) => session.actions.updateNote(exercise.id, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="px-4 pb-4 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {session.inputs[exercise.id]?.filter(set => set.completed).map((set, idx) => {
                        const recordType = exercise.record_type;
                        return (
                          <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {idx + 1}세트: {recordType === 'time' ? formatDurationSeconds(Number(set.time)) : recordType === 'reps_only' ? `${set.reps}회` : `${set.weight}kg × ${set.reps}회`}
                          </span>
                        );
                      })}
                    </div>
                    {session.notes[exercise.id] && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 border border-gray-200">
                        <span className="font-medium">메모:</span> {session.notes[exercise.id]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* 하단 고정 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg">
          <div className="max-w-md mx-auto">
            {/* 다음 세트가 있고 미완료 세트가 있는 경우 */}
            {session.actions.hasIncompleteSets() && !isLastExercise ? (
              <div className="flex gap-3">
                <Button
                  onClick={handleNextButtonClick}
                  isLoading={session.isSaving}
                  variant="secondary"
                  fullWidth
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 shadow-md"
                >
                  <Check className="w-5 h-5" />
                  다음 세트 완료
                </Button>
                <Button
                  onClick={() => {
                    // 완료 처리 없이 바로 다음 세트로 이동
                    session.actions.moveToNextExercise();
                  }}
                  isLoading={session.isSaving}
                  variant="primary"
                  fullWidth
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
                >
                  다음 운동으로
                  <Check className="w-5 h-5" />
                </Button>
              </div>
            ) : isLastExercise ? (
              // 마지막 운동 - 저장 버튼
              <Button
                onClick={handleNextButtonClick}
                isLoading={session.isSaving}
                variant="primary"
                fullWidth
                size="lg"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
              >
                <Check className="w-5 h-5" />
                운동 기록 저장
              </Button>
            ) : (
              // 다음 운동이 있는 경우
              <Button
                onClick={handleNextButtonClick}
                isLoading={session.isSaving}
                variant="primary"
                fullWidth
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
              >
                <Check className="w-5 h-5" />
                다음 운동으로
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 휴식 타이머 모달 (세트 간 휴식) */}
      {timer.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="mb-6">
              <Timer className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">세트 간 휴식</h2>
              <p className="text-slate-600">잠시 쉬고 다음 세트를 준비하세요</p>
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

            <Button
              onClick={timer.skip}
              fullWidth
              size="lg"
              variant="primary"
              className="shadow-md"
            >
              휴식 건너뛰기
            </Button>
          </div>
        </div>
      )}

      {/* 미완료 세트 확인 팝업 */}
      {showSkipConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SkipForward className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">미완료된 세트가 있습니다</h2>
              <p className="text-slate-600">
                완료되지 않은 세트를 건너뛰고<br />
                다음 운동으로 넘어가시겠습니까?
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowSkipConfirm(false)}
                variant="secondary"
                fullWidth
              >
                취소
              </Button>
              <Button
                onClick={confirmSkipAndMoveNext}
                fullWidth
              >
                넘어가기
              </Button>
            </div>
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
                    const completedSets = inputs.filter(set => set.completed);

                    if (completedSets.length === 0) return null;

                    const recordType = exercise.record_type;

                    return (
                      <div key={exercise.id} className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-slate-700 mb-2">{exercise.name}</h4>
                        <div className="space-y-1">
                          {completedSets.map((set, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-slate-600">{index + 1}세트</span>
                               <span className="text-slate-800">
                                 {recordType === 'time'
                                   ? formatDurationSeconds(Number(set.time))
                                   : recordType === 'reps_only'
                                     ? `${set.reps}회`
                                     : `${set.weight}kg × ${set.reps}회`
                                 }
                               </span>
                            </div>
                          ))}
                        </div>
                        {session.notes[exercise.id] && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">메모:</span> {session.notes[exercise.id]}
                            </p>
                          </div>
                        )}
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