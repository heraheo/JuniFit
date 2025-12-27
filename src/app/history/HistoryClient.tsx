"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ChevronRight, Trash2, Edit3, X, Save } from "lucide-react";
import { deleteWorkoutSession, updateWorkoutSet, getWorkoutLogs } from "@/lib/api";
import type { WorkoutSession, WorkoutSet } from "@/types/database";
import { formatDateWithWeekday, formatTime, calculateDuration, groupSetsByExercise } from "@/lib/utils";
import Button from "@/components/ui/Button";

type WorkoutLog = WorkoutSession & {
  sets: WorkoutSet[];
  programTitle?: string;
};

type EditingSet = {
  id: string;
  weight: string;
  reps: string;
  time: string;
};

interface HistoryClientProps {
  initialLogs: WorkoutLog[];
  initialLimit?: number;
}

const PAGE_SIZE = 10;

export function HistoryClient({ initialLogs, initialLimit = PAGE_SIZE }: HistoryClientProps) {
  const [logs, setLogs] = useState<WorkoutLog[]>(initialLogs);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingSets, setEditingSets] = useState<Record<string, EditingSet>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialLogs.length >= initialLimit);

  async function fetchLogs() {
    const data = await getWorkoutLogs();
    setLogs(data);
  }

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const newLogs = await getWorkoutLogs(PAGE_SIZE, logs.length);
      if (newLogs.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setLogs([...logs, ...newLogs]);
    } catch (error) {
      console.error('Error loading more logs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }

  const toggleSession = (sessionId: string) => {
    if (editingSession === sessionId) return;
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const startEditing = (log: WorkoutLog) => {
    const setsMap: Record<string, EditingSet> = {};
    log.sets.forEach((set) => {
      setsMap[set.id] = {
        id: set.id,
        weight: String(set.weight || ''),
        reps: String(set.reps || ''),
        time: String(set.time || ''),
      };
    });
    setEditingSets(setsMap);
    setEditingSession(log.id);
    setExpandedSession(log.id);
  };

  const cancelEditing = () => {
    setEditingSession(null);
    setEditingSets({});
  };

  const saveEditing = async (log: WorkoutLog) => {
    setIsSaving(true);
    try {
      for (const set of log.sets) {
        const editedSet = editingSets[set.id];
        if (editedSet) {
          const weight = parseFloat(editedSet.weight) || 0;
          const reps = parseInt(editedSet.reps) || 0;
          const time = parseFloat(editedSet.time) || 0;

          if (weight !== set.weight || reps !== set.reps || time !== set.time) {
            await updateWorkoutSet(set.id, weight || null, reps || null, time || null);
          }
        }
      }

      await fetchLogs();
      cancelEditing();
    } catch (error) {
      console.error("Error saving:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditingSet = (setId: string, field: keyof EditingSet, value: string) => {
    setEditingSets((prev) => ({
      ...prev,
      [setId]: {
        ...prev[setId],
        [field]: value,
      },
    }));
  };

  const handleDelete = async (sessionId: string) => {
    const success = await deleteWorkoutSession(sessionId);
    if (success) {
      await fetchLogs();
      setDeleteConfirm(null);
    } else {
      alert("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        const isExpanded = expandedSession === log.id;
        const isEditing = editingSession === log.id;
        const groupedSets = groupSetsByExercise(log.sets);
        const exerciseCount = Object.keys(groupedSets).length;
        const totalSets = log.sets.length;

        return (
          <div key={log.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            {/* Header */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isEditing && toggleSession(log.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <h3 className="text-base font-semibold text-slate-800">
                      {formatDateWithWeekday(log.started_at)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                    <span>{formatTime(log.started_at)}</span>
                    <span>•</span>
                    <span>{calculateDuration(log.started_at, log.ended_at)}</span>
                  </div>
                  {log.programTitle && (
                    <p className="text-sm text-blue-600 mb-2">{log.programTitle}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      운동 {exerciseCount}종목
                    </span>
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                      총 {totalSets}세트
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-1">
                  {!isEditing && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(log);
                        }}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(log.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {!isEditing && (
                    <div className="p-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100">
                {isEditing && (
                  <div className="flex gap-2 py-3">
                    <Button
                      onClick={() => saveEditing(log)}
                      disabled={isSaving}
                      variant="primary"
                      size="sm"
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {isSaving ? "저장 중..." : "저장"}
                    </Button>
                    <Button
                      onClick={cancelEditing}
                      disabled={isSaving}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-1" />
                      취소
                    </Button>
                  </div>
                )}

                <div className="space-y-3 mt-3">
                  {Object.entries(groupedSets).map(([exerciseName, sets]) => (
                    <div key={exerciseName} className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-medium text-slate-700 mb-2">{exerciseName}</h4>
                      <div className="space-y-2">
                        {sets.map((set, index) => (
                          <div
                            key={set.id}
                            className="flex justify-between text-sm items-center"
                          >
                            <span className="text-slate-600 w-12">{index + 1}세트</span>
                            {isEditing ? (
                              <div className="flex gap-2 items-center flex-1 justify-end">
                                <input
                                  type="number"
                                  value={editingSets[set.id]?.weight || ""}
                                  onChange={(e) =>
                                    updateEditingSet(set.id, "weight", e.target.value)
                                  }
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                                  placeholder="무게"
                                  step="0.5"
                                />
                                <span className="text-slate-500">kg ×</span>
                                <input
                                  type="number"
                                  value={editingSets[set.id]?.reps || ""}
                                  onChange={(e) =>
                                    updateEditingSet(set.id, "reps", e.target.value)
                                  }
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                                  placeholder="횟수"
                                />
                                <span className="text-slate-500">회</span>
                              </div>
                            ) : (
                              <span className="text-slate-800">
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

            {/* Delete Confirmation */}
            {deleteConfirm === log.id && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="bg-red-50 rounded-lg p-4 mt-3">
                  <p className="text-sm text-red-800 mb-3">정말 이 운동 기록을 삭제하시겠습니까?</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDelete(log.id)}
                      variant="primary"
                      size="sm"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      삭제
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirm(null)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      취소
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 더 보기 버튼 */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={loadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="px-8"
          >
            {isLoadingMore ? "로딩 중..." : "더 보기"}
          </Button>
        </div>
      )}
    </div>
  );
}
