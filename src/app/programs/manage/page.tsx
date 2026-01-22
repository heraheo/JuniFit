"use client";

import Link from "next/link";
import { ArrowLeft, Trash2, Edit, ChevronDown, ChevronRight, Dumbbell } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { formatDurationSeconds } from "@/lib/utils";
import { useProgramsManage } from "@/hooks/useProgramsManage";

export default function ProgramsManagePage() {
  const {
    state: { programs, loading, deleting, expandedProgram },
    actions: { toggleProgram, handleDelete },
  } = useProgramsManage();

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">프로그램 관리</h1>
        </header>

        {/* Loading State */}
        {loading ? (
          <LoadingSpinner />
        ) : programs.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="등록된 프로그램이 없습니다"
            description="나만의 운동 프로그램을 만들어보세요. 체계적인 운동 관리를 시작할 수 있습니다."
            actionLabel="새 프로그램 만들기"
            actionHref="/templates/new"
          />
        ) : (
          /* Programs List */
          <section className="space-y-4">
            {programs.map((program) => {
              const isExpanded = expandedProgram === program.id;
              
              return (
                <div
                  key={program.id}
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                >
                  {/* 프로그램 헤더 */}
                  <div 
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleProgram(program.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-800">
                            {program.title}
                          </h3>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        {program.description && (
                          <p className="text-sm text-slate-600 mt-1">
                            {program.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          생성일: {new Date(program.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 운동 목록 (펼침) */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      {program.exercises && program.exercises.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                            운동 목록 ({program.exercises.length}개)
                          </p>
                              {program.exercises.map((exercise: any, index: number) => (

                            <div 
                              key={exercise.id}
                              className="bg-white rounded-lg p-3 border border-gray-200"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-blue-700">{index + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-slate-800 text-sm">
                                    {exercise.name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                     <span>{exercise.target_sets}세트</span>
                                     {exercise.target_reps && (
                                       <>
                                         <span>×</span>
                                         <span>{exercise.target_reps}회</span>
                                       </>
                                     )}
                                     {exercise.target_time && (
                                       <>
                                         <span>×</span>
                                         <span>{formatDurationSeconds(exercise.target_time)}</span>
                                       </>
                                     )}
                                     {exercise.rest_seconds && (
                                       <>
                                         <span className="text-slate-300">|</span>
                                         <span>휴식 {exercise.rest_seconds}초</span>
                                       </>
                                     )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Dumbbell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">등록된 운동이 없습니다</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 p-4 border-t border-gray-100">
                    <Link
                      href={`/programs/edit/${program.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="font-medium">수정</span>
                    </Link>

                    <Button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleDelete(program);
                      }}
                      isLoading={deleting === program.id}
                      variant="danger"
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="font-medium">
                        삭제
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Create New Button */}
        {!loading && programs.length > 0 && (
          <div className="mt-6">
            <Link href="/templates/new">
              <Button
                variant="primary"
                fullWidth
                className="py-3"
              >
                + 새 프로그램 만들기
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
