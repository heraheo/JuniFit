"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Save, X, Edit2, Calendar } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  getWorkoutLogById,
  deleteWorkoutSession,
  updateWorkoutSet,
  updateSessionNote,
} from "@/lib/api";
import type { WorkoutSet, WorkoutLogDetail } from "@/types/database";
import { formatDateWithWeekday, formatTime, calculateDuration, groupSetsByExercise } from "@/lib/utils";

type WorkoutLog = WorkoutLogDetail;

type EditableSet = {
  id: string;
  session_id: string;
  exercise_name: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  created_at: string;
  isEditing?: boolean;
  editWeight?: number;
  editReps?: number;
  editRpe?: number | null;
  isNew?: boolean;
};

export default function WorkoutLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editableSets, setEditableSets] = useState<EditableSet[]>([]);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    async function fetchLog() {
      const data = await getWorkoutLogById(resolvedParams.id);
      setLog(data);
      if (data) {
        // 모든 세트를 표시 (weight와 reps가 0인 것은 미완료로 표시)
        const allSets: EditableSet[] = data.sets.map((set: WorkoutSet) => {
          const isIncomplete = set.weight === 0 && set.reps === 0;
          return {
            id: set.id,
            session_id: set.session_id,
            exercise_name: set.exercise_name,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            created_at: set.created_at,
            isEditing: false,
            editWeight: set.weight,
            editReps: set.reps,
            editRpe: set.rpe,
            isNew: isIncomplete, // 0이면 미완료로 표시
          };
        });
        
        setEditableSets(allSets);
        setEditNote(data.note || "");
      }
      setLoading(false);
    }
    fetchLog();
  }, [resolvedParams.id]);

  // 삭제 핸들러
  const handleDelete = async () => {
    const confirmed = window.confirm(
      "정말로 이 운동 기록을 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다."
    );
    if (!confirmed) return;

    setDeleting(true);
    const success = await deleteWorkoutSession(resolvedParams.id);
    if (success) {
      router.push("/history");
    } else {
      alert("삭제 중 오류가 발생했습니다.");
      setDeleting(false);
    }
  };

  // 세트 수정 모드 토글
  const toggleSetEdit = (setId: string) => {
    setEditableSets((prev) =>
      prev.map((set) =>
        set.id === setId
          ? { ...set, isEditing: !set.isEditing }
          : set
      )
    );
  };

  // 세트 수정 값 변경
  const handleSetChange = (
    setId: string,
    field: "editWeight" | "editReps" | "editRpe",
    value: number | null
  ) => {
    setEditableSets((prev) =>
      prev.map((set) =>
        set.id === setId ? { ...set, [field]: value } : set
      )
    );
  };

  // 세트 저장
  const handleSetSave = async (setId: string) => {
    const targetSet = editableSets.find((s) => s.id === setId);
    if (!targetSet) return;

    // 기존 세트 업데이트
    const result = await updateWorkoutSet(
      setId,
      targetSet.editWeight || 0,
      targetSet.editReps || 0,
      targetSet.editRpe || undefined
    );

    if (result) {
      const isStillIncomplete = result.weight === 0 && result.reps === 0;
      setEditableSets((prev) =>
        prev.map((set) =>
          set.id === setId
            ? {
                id: result.id,
                session_id: result.session_id,
                exercise_name: result.exercise_name,
                set_number: result.set_number,
                weight: result.weight,
                reps: result.reps,
                rpe: result.rpe,
                created_at: result.created_at,
                isEditing: false,
                editWeight: result.weight,
                editReps: result.reps,
                editRpe: result.rpe,
                isNew: isStillIncomplete,
              }
            : set
        )
      );
    } else {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  // 세트 수정 취소
  const handleSetCancel = (setId: string) => {
    setEditableSets((prev) =>
      prev.map((set) =>
        set.id === setId
          ? {
              ...set,
              isEditing: false,
              editWeight: set.weight,
              editReps: set.reps,
              editRpe: set.rpe,
            }
          : set
      )
    );
  };

  // 노트 저장
  const handleNoteSave = async () => {
    setSavingNote(true);
    const result = await updateSessionNote(resolvedParams.id, editNote);
    if (result) {
      setLog((prev) => (prev ? { ...prev, note: editNote } : null));
      setIsEditingNote(false);
    } else {
      alert("노트 저장 중 오류가 발생했습니다.");
    }
    setSavingNote(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
        <div className="max-w-md mx-auto">
          <p className="text-center text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
        <div className="max-w-md mx-auto">
          <header className="flex items-center mb-6">
            <Link href="/history" className="text-slate-600 mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">운동 기록 상세</h1>
          </header>
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <p className="text-slate-600">운동 기록을 찾을 수 없습니다.</p>
            <Link
              href="/history"
              className="inline-block mt-4 text-blue-600 hover:underline"
            >
              기록 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const groupedSets = groupSetsByExercise(editableSets);
  const exerciseCount = Object.keys(groupedSets).length;
  const totalSets = editableSets.length;

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link href="/history" className="text-slate-600 mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">운동 기록 상세</h1>
          </div>
          <Button
            onClick={handleDelete}
            isLoading={deleting}
            variant="danger"
            size="sm"
            className="flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">삭제</span>
          </Button>
        </header>

        {/* 세션 정보 */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-semibold text-slate-800">
              {formatDateWithWeekday(log.started_at)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
            <span>{formatTime(log.started_at)}</span>
            <span>•</span>
            <span>{calculateDuration(log.started_at, log.ended_at)}</span>
          </div>
          {log.programTitle && (
            <p className="text-sm text-blue-600 mb-2">{log.programTitle}</p>
          )}
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              운동 {exerciseCount}종목
            </span>
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
              총 {totalSets}세트
            </span>
          </div>
        </div>

        {/* 운동별 세트 정보 */}
        <div className="space-y-4 mb-4">
          {Object.entries(groupedSets).map(([exerciseName, sets]) => (
            <div
              key={exerciseName}
              className="bg-white rounded-xl shadow-md p-4"
            >
              <h3 className="font-bold text-slate-800 mb-3">{exerciseName}</h3>
              <div className="space-y-2">
                {sets
                  .sort((a, b) => a.set_number - b.set_number)
                  .map((set) => (
                    <div
                      key={set.id}
                      className={`rounded-lg p-3 ${
                        set.isNew ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      {set.isEditing ? (
                        /* 수정 모드 */
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                            <span className="font-medium">{set.set_number}세트</span>
                            {set.isNew && (
                              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                미완료
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                무게(kg)
                              </label>
                              <input
                                type="number"
                                value={set.editWeight || ""}
                                onChange={(e) =>
                                  handleSetChange(
                                    set.id,
                                    "editWeight",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                횟수
                              </label>
                              <input
                                type="number"
                                value={set.editReps || ""}
                                onChange={(e) =>
                                  handleSetChange(
                                    set.id,
                                    "editReps",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                RPE
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={set.editRpe || ""}
                                onChange={(e) =>
                                  handleSetChange(
                                    set.id,
                                    "editRpe",
                                    e.target.value ? Number(e.target.value) : null
                                  )
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                            <Button
                              onClick={() => handleSetCancel(set.id)}
                              variant="secondary"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              취소
                            </Button>
                            <Button
                              onClick={() => handleSetSave(set.id)}
                              variant="primary"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              저장
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* 보기 모드 */
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-slate-600 text-sm">
                              {set.set_number}세트
                            </span>
                            {set.isNew ? (
                              <span className="text-sm text-blue-600 italic">
                                미완료 - 클릭하여 추가
                              </span>
                            ) : (
                              <span className="font-medium text-slate-800">
                                {set.weight}kg × {set.reps}회
                                {set.rpe && (
                                  <span className="text-slate-500 ml-1">
                                    (RPE {set.rpe})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <Button
                            onClick={() => toggleSetEdit(set.id)}
                            variant="ghost"
                            size="sm"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* 노트 섹션 */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-800">메모</h3>
            {!isEditingNote && (
              <Button
                onClick={() => setIsEditingNote(true)}
                variant="ghost"
                size="sm"
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          {isEditingNote ? (
            <div className="space-y-2">
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={3}
                placeholder="오늘 운동에 대한 메모를 남겨보세요..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setIsEditingNote(false);
                    setEditNote(log.note || "");
                  }}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  취소
                </Button>
                <Button
                  onClick={handleNoteSave}
                  isLoading={savingNote}
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              {log.note || "메모가 없습니다."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
