import { useState, useCallback } from 'react';
import { saveWorkoutSet, completeWorkoutSession } from '@/lib/api';
import type { ProgramWithExercises } from '@/lib/api';

type SetInput = {
  weight: string;
  reps: string;
};

type ExerciseNotes = {
  [exerciseId: string]: string;
};

type InputErrors = {
  [exerciseId: string]: {
    [setIndex: number]: {
      weight?: string;
      reps?: string;
    };
  };
};

interface UseWorkoutSessionOptions {
  program: ProgramWithExercises | null;
  sessionId: string | null;
  onComplete: () => void;
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
    updateInput: (exerciseId: string, setIndex: number, field: keyof SetInput, value: string) => void;
    updateNote: (exerciseId: string, note: string) => void;
    isCurrentValid: () => boolean;
    completeExercise: (exerciseIndex: number) => void;
    completeAll: () => Promise<void>;
    moveToNext: () => void;
    closeModal: () => void;
    initializeInputs: (program: ProgramWithExercises) => void;
  };
}

export function useWorkoutSession({
  program,
  sessionId,
  onComplete,
  exerciseRefs,
}: UseWorkoutSessionOptions): UseWorkoutSessionReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputs, setInputs] = useState<Record<string, SetInput[]>>({});
  const [notes, setNotes] = useState<ExerciseNotes>({});
  const [errors, setErrors] = useState<InputErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // 입력값 검증
  const validateInput = useCallback((value: string, field: 'weight' | 'reps'): string | null => {
    if (value.trim() === '') return null;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return field === 'weight' ? '무게는 양수여야 합니다' : '횟수는 양의 정수여야 합니다';
    }
    
    if (field === 'reps' && !Number.isInteger(numValue)) {
      return '횟수는 정수여야 합니다';
    }
    
    return null;
  }, []);

  // 세트 입력값 업데이트
  const updateInput = useCallback((exerciseId: string, setIndex: number, field: keyof SetInput, value: string) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) {
      return;
    }
    
    setInputs(prev => {
      // inputs[exerciseId]가 존재하지 않으면 초기화
      if (!prev[exerciseId]) {
        return prev;
      }
      
      return {
        ...prev,
        [exerciseId]: prev[exerciseId].map((set, idx) => 
          idx === setIndex ? { ...set, [field]: value } : set
        )
      };
    });

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
  }, [validateInput]);

  // 메모 업데이트
  const updateNote = useCallback((exerciseId: string, note: string) => {
    setNotes(prev => ({
      ...prev,
      [exerciseId]: note,
    }));
  }, []);

  // 현재 운동의 입력이 유효한지 확인
  const isCurrentValid = useCallback(() => {
    if (!program) return false;
    const exercise = program.exercises[currentIndex];
    const exerciseInputs = inputs[exercise.id] || [];
    return exerciseInputs.some(set => set.weight.trim() !== '' && set.reps.trim() !== '');
  }, [program, currentIndex, inputs]);

  // 다음 운동으로 이동
  const moveToNext = useCallback(() => {
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
          ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [program, currentIndex, exerciseRefs]);

  // 모든 운동 완료 처리
  const completeAll = useCallback(async () => {
    if (isSaving || !program) return;
    
    setIsSaving(true);
    
    try {
      if (sessionId) {
        for (const exercise of program.exercises) {
          const exerciseInputs = inputs[exercise.id] || [];
          const exerciseNote = notes[exercise.id] || '';
          
          for (let i = 0; i < exercise.target_sets; i++) {
            const set = exerciseInputs[i];
            const weight = set?.weight.trim() !== '' ? parseFloat(set.weight) : 0;
            const reps = set?.reps.trim() !== '' ? parseInt(set.reps) : 0;
            
            const result = await saveWorkoutSet(
              sessionId,
              exercise.name,
              i + 1,
              weight,
              reps,
              undefined,
              exerciseNote || undefined
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
  }, [isSaving, program, sessionId, inputs, notes]);

  // 개별 운동 완료
  const completeExercise = useCallback((exerciseIndex: number) => {
    if (!program) return;
    
    const isLastExercise = exerciseIndex === program.exercises.length - 1;
    
    if (isLastExercise) {
      completeAll();
    } else {
      onComplete();
    }
  }, [program, onComplete, completeAll]);

  // 입력값 초기화
  const initializeInputs = useCallback((programData: ProgramWithExercises) => {
    const initialInputs: Record<string, SetInput[]> = {};
    const initialNotes: ExerciseNotes = {};
    
    programData.exercises.forEach((exercise) => {
      initialInputs[exercise.id] = Array(exercise.target_sets).fill(null).map(() => ({
        weight: "",
        reps: "",
      }));
      initialNotes[exercise.id] = "";
    });
    
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
      updateNote,
      isCurrentValid,
      completeExercise,
      completeAll,
      moveToNext,
      closeModal,
      initializeInputs,
    },
  };
}