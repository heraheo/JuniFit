"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Dumbbell, ChevronDown, ChevronRight, Trash2, Edit3, X, Save } from "lucide-react";
import { getWorkoutLogs, deleteWorkoutSession, updateWorkoutSet } from "@/lib/api";
import type { WorkoutSession, WorkoutSet } from "@/types/database";
import { formatDateWithWeekday, formatTime, calculateDuration, groupSetsByExercise } from "@/lib/utils";

type WorkoutLog = WorkoutSession & {
  sets: WorkoutSet[];
  programTitle?: string;
};

type EditingSet = {
  id: string;
  weight: string;
  reps: string;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingSets, setEditingSets] = useState<Record<string, EditingSet>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    const data = await getWorkoutLogs();
    setLogs(data);
    setLoading(false);
  }

  const toggleSession = (sessionId: string) => {
    if (editingSession === sessionId) return; // 수정 중일 때는 접기 방지
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  // 수정 모드 시작
  const startEditing = (log: WorkoutLog) => {
    const setsMap: Record<string, EditingSet> = {};
    log.sets.forEach((set) => {
      setsMap[set.id] = {
        id: set.id,
        weight: String(set.weight),
        reps: String(set.reps),
      };
    });
    setEditingSets(setsMap);
    setEditingSession(log.id);
    setExpandedSession(log.id);
  };

  // 수정 모드 취소
  const cancelEditing = () => {
    setEditingSession(null);
    setEditingSets({});
  };

  // 수정 저장
  const saveEditing = async (log: WorkoutLog) => {
    setIsSaving(true);
    try {
      // 각 세트 업데이트
      for (const set of log.sets) {
        const editedSet = editingSets[set.id];
        if (editedSet) {
          const weight = parseFloat(editedSet.weight) || 0;
          const reps = parseInt(editedSet.reps) || 0;
          
          if (weight !== set.weight || reps !== set.reps) {
            await updateWorkoutSet(set.id, weight, reps);
          }
        }
      }

      // 데이터 다시 불러오기
      await fetchLogs();
      cancelEditing();
    } catch (error) {
      console.error("Error saving:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 세트 값 변경
  const updateEditingSet = (setId: string, field: keyof EditingSet, value: string) => {
    setEditingSets((prev) => ({
      ...prev,
      [setId]: {
        ...prev[setId],
        [field]: value,
      },
    }));
  };

  // 삭제 처리
  const handleDelete = async (sessionId: string) => {
    const success = await deleteWorkoutSession(sessionId);
    if (success) {
      setLogs((prev) => prev.filter((log) => log.id !== sessionId));
      setDeleteConfirm(null);
    } else {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">지난 운동 기록</h1>
        </header>

        {/* 로딩 상태 */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">로딩 중...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <Dumbbell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">아직 운동 기록이 없습니다.</p>
            <Link
              href="/workout"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              운동 시작하기
            </Link>
          </div>
        ) : (
          <section className="flex flex-col gap-4">
            {logs.map((log) => {
              const isExpanded = expandedSession === log.id;
              const isEditing = editingSession === log.id;
              const groupedSets = groupSetsByExercise(log.sets);
              const exerciseCount = Object.keys(groupedSets).length;
              const totalSets = log.sets.length;

              return (
                <div
                  key={log.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden"
                >
                  {/* 세션 헤더 */}
                  <div
                    className={`p-4 ${!isEditing ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                    onClick={() => toggleSession(log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-slate-800">
                            {formatDateWithWeekday(log.started_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <span>{formatTime(log.started_at)}</span>
                          <span>•</span>
                            <span>{calculateDuration(log.started_at, log.ended_at)}</span>
                        </div>
                        {log.programTitle && (
                          <p className="text-sm text-blue-600 mt-1">
                            {log.programTitle}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            운동 {exerciseCount}종목
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            총 {totalSets}세트
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {!isEditing && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(log);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="수정"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(log.id);
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 삭제 확인 */}
                  {deleteConfirm === log.id && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="bg-red-50 rounded-lg p-4 mt-3">
                        <p className="text-sm text-red-800 mb-3">
                          이 운동 기록을 삭제하시겠습니까?<br />
                          삭제된 기록은 복구할 수 없습니다.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            삭제
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="flex-1 py-2 bg-gray-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 세션 상세 */}
                  {isExpanded && deleteConfirm !== log.id && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      {/* 수정 모드 헤더 */}
                      {isEditing && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-blue-600">수정 모드</span>
                          <div className="flex gap-2">
                            <button
                              onClick={cancelEditing}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition-colors"
                              disabled={isSaving}
                            >
                              <X className="w-4 h-4" />
                              취소
                            </button>
                            <button
                              onClick={() => saveEditing(log)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                              disabled={isSaving}
                            >
                              <Save className="w-4 h-4" />
                              {isSaving ? "저장 중..." : "저장"}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 mt-4">
                        {Object.entries(groupedSets).map(([exerciseName, sets]) => (
                          <div key={exerciseName} className="bg-gray-50 rounded-lg p-3">
                            <h4 className="font-medium text-slate-700 mb-2">
                              {exerciseName}
                            </h4>
                            <div className="space-y-2">
                              {sets
                                .sort((a, b) => a.set_number - b.set_number)
                                .map((set) => (
                                  <div
                                    key={set.id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-slate-600 w-12">
                                      {set.set_number}세트
                                    </span>
                                    {isEditing ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          value={editingSets[set.id]?.weight || ""}
                                          onChange={(e) => updateEditingSet(set.id, "weight", e.target.value)}
                                          className="w-16 px-2 py-1 border rounded text-center text-sm"
                                          placeholder="kg"
                                          step="0.5"
                                        />
                                        <span className="text-slate-500">kg ×</span>
                                        <input
                                          type="number"
                                          value={editingSets[set.id]?.reps || ""}
                                          onChange={(e) => updateEditingSet(set.id, "reps", e.target.value)}
                                          className="w-14 px-2 py-1 border rounded text-center text-sm"
                                          placeholder="회"
                                        />
                                        <span className="text-slate-500">회</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-800 font-medium">
                                        {set.weight}kg × {set.reps}회
                                      </span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
