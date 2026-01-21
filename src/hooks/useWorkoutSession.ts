import { useState, useCallback } from "react";
import type { ProgramWithExercises } from "@/lib/api";
import {
  completeRemainingSets,
  hasIncompleteSets,
  isCurrentValid,
  skipSet,
  toggleSetCompletion,
  updateSetInput,
} from "@/lib/workout/actions";
import { createInitialWorkoutState } from "@/lib/workout/state";
import { persistWorkoutSession } from "@/lib/workout/persistence";
import { isNumericInput } from "@/lib/workout/validation";

type SetInput = {
  weight: string;
  reps: string;
  time: string;
  completed: boolean;
};

type ExerciseNotes = {
  [exerciseId: string]: string;
};

type InputErrors = {
  [exerciseId: string]: {
    [setIndex: number]: {
      weight?: string;
      reps?: string;
      time?: string;
    };
  };
};

interface UseWorkoutSessionOptions {
  program: ProgramWithExercises | null;
  sessionId: string | null;
  onSetComplete: (restSeconds: number) => void;
  exerciseRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

interface UseWorkoutSessionReturn {
  currentIndex: number;
  inputs: Record<string, SetInput[]>;
  notes: ExerciseNotes;
  errors: InputErrors;
  isSaving: boolean;
  showCompletionModal: boolean;
  actions: {
    updateInput: (exerciseId: string, setIndex: number, field: keyof Omit<SetInput, 'completed'>, value: string) => void;
    toggleSetComplete: (exerciseId: string, setIndex: number) => void;
    skipSet: (exerciseId: string, setIndex: number) => void;
    updateNote: (exerciseId: string, note: string) => void;
    isCurrentValid: () => boolean;
    hasIncompleteSets: () => boolean;
    completeRemainingSets: () => void;
    moveToNextExercise: () => void;
    completeAll: () => Promise<void>;
    closeModal: () => void;
    initializeInputs: (program: ProgramWithExercises) => void;
  };
}

export function useWorkoutSession({
  program,
  sessionId,
  onSetComplete,
  exerciseRefs,
}: UseWorkoutSessionOptions): UseWorkoutSessionReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputs, setInputs] = useState<Record<string, SetInput[]>>({});
  const [notes, setNotes] = useState<ExerciseNotes>({});
  const [errors, setErrors] = useState<InputErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const updateInput = useCallback(
    (exerciseId: string, setIndex: number, field: keyof Omit<SetInput, "completed">, value: string) => {
      if (value !== "" && !isNumericInput(value)) {
        return;
      }

      updateSetInput({
        exerciseId,
        setIndex,
        field,
        value,
        inputs,
        setInputs,
        setErrors,
      });
    },
    [inputs]
  );

  // 메모 업데이트
  const updateNote = useCallback((exerciseId: string, note: string) => {
    setNotes((prev) => ({
      ...prev,
      [exerciseId]: note,
    }));
  }, []);

  const toggleSetComplete = useCallback(
    (exerciseId: string, setIndex: number) => {
      toggleSetCompletion({
        exerciseId,
        setIndex,
        program,
        inputs,
        setInputs,
        onSetComplete,
      });
    },
    [program, inputs, onSetComplete]
  );

  const skipSetAction = useCallback(
    (exerciseId: string, setIndex: number) => {
      skipSet({
        exerciseId,
        setIndex,
        program,
        inputs,
        setInputs,
        onSetComplete,
      });
    },
    [program, inputs, onSetComplete]
  );

  const isCurrentValidAction = useCallback(() => {
    return isCurrentValid({ program, currentIndex, inputs });
  }, [program, currentIndex, inputs]);

  const hasIncompleteSetsAction = useCallback(() => {
    return hasIncompleteSets({ program, currentIndex, inputs });
  }, [program, currentIndex, inputs]);

  const completeRemainingSetsAction = useCallback(() => {
    completeRemainingSets({ program, currentIndex, setInputs });
  }, [program, currentIndex]);

  // 모든 운동 완료 처리
  const completeAll = useCallback(async () => {
    if (isSaving || !program) return;

    setIsSaving(true);

    const result = await persistWorkoutSession({ sessionId, program, inputs, notes });

    if (!result.ok) {
      setIsSaving(false);
      alert(`운동 기록 저장 중 오류가 발생했습니다.\n${result.message}`);
      return;
    }

    setIsSaving(false);
    setShowCompletionModal(true);
  }, [isSaving, program, sessionId, inputs, notes]);

  // 다음 운동으로 이동 (타이머 없음)
  const moveToNextExercise = useCallback(() => {
    if (!program) return;

    const nextIndex = currentIndex + 1;

    if (nextIndex >= program.exercises.length) {
      completeAll();
    } else {
      setCurrentIndex(nextIndex);

      setTimeout(() => {
        const nextExercise = program.exercises[nextIndex];
        const ref = exerciseRefs.current[nextExercise.id];
        if (ref) {
          ref.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [program, currentIndex, exerciseRefs, completeAll]);

  // 입력값 초기화
  const initializeInputs = useCallback((programData: ProgramWithExercises) => {
    const { inputs: initialInputs, notes: initialNotes } = createInitialWorkoutState(programData);
    setInputs(initialInputs);
    setNotes(initialNotes);
  }, []);

  // 완료 모달 닫기
  const closeModal = useCallback(() => {
    setShowCompletionModal(false);
  }, []);

  return {
    currentIndex,
    inputs,
    notes,
    errors,
    isSaving,
    showCompletionModal,
    actions: {
      updateInput,
      toggleSetComplete,
      skipSet: skipSetAction,
      updateNote,
      isCurrentValid: isCurrentValidAction,
      hasIncompleteSets: hasIncompleteSetsAction,
      completeRemainingSets: completeRemainingSetsAction,
      moveToNextExercise,
      completeAll,
      closeModal,
      initializeInputs,
    },
  };
}
