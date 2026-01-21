import { useState } from "react";
import { deleteWorkoutSession, getWorkoutLogs } from "@/lib/api";
import { persistWorkoutEdits } from "@/lib/workout/persistence";
import type { WorkoutSession, WorkoutSet } from "@/types/database";

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

type UseWorkoutHistoryOptions = {
  initialLogs: WorkoutLog[];
  initialLimit: number;
};

export const PAGE_SIZE = 10;

export const useWorkoutHistory = ({ initialLogs, initialLimit }: UseWorkoutHistoryOptions) => {
  const [logs, setLogs] = useState<WorkoutLog[]>(initialLogs);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingSets, setEditingSets] = useState<Record<string, EditingSet>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialLogs.length >= initialLimit);

  const fetchLogs = async () => {
    const data = await getWorkoutLogs();
    setLogs(data);
  };

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const newLogs = await getWorkoutLogs(PAGE_SIZE, logs.length);
      if (newLogs.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setLogs([...logs, ...newLogs]);
    } catch (error) {
      console.error("Error loading more logs:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleSession = (sessionId: string) => {
    if (editingSession === sessionId) return;
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const startEditing = (log: WorkoutLog) => {
    const setsMap: Record<string, EditingSet> = {};
    log.sets.forEach((set) => {
      setsMap[set.id] = {
        id: set.id,
        weight: String(set.weight || ""),
        reps: String(set.reps || ""),
        time: String(set.time || ""),
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
      const result = await persistWorkoutEdits({
        sets: log.sets,
        editingSets,
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      if (result.changed) {
        await fetchLogs();
      }

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

  return {
    logs,
    expandedSession,
    editingSession,
    editingSets,
    deleteConfirm,
    isSaving,
    isLoadingMore,
    hasMore,
    actions: {
      toggleSession,
      startEditing,
      cancelEditing,
      saveEditing,
      updateEditingSet,
      handleDelete,
      loadMore,
      setDeleteConfirm,
    },
  };
};

export type { WorkoutLog, EditingSet };
