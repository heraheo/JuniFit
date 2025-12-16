import { useState, useCallback } from 'react';
import { saveWorkoutSet, completeWorkoutSession } from '@/lib/api';
import type { ProgramWithExercises } from '@/lib/api';

type SetInput = {
  weight: string;
  reps: string;
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
    updateNote: (exerciseId: string, note: string) => void;
    isCurrentValid: () => boolean;
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
  const updateInput = useCallback((exerciseId: string, setIndex: number, field: keyof Omit<SetInput, 'completed'>, value: string) => {
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

  // 세트 완료 토글
  const toggleSetComplete = useCallback((exerciseId: string, setIndex: number) => {
    if (!program) return;

    const exercise = program.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const currentSet = inputs[exerciseId]?.[setIndex];
    if (!currentSet) return;

    // 입력값 검증
    const weight = currentSet.weight.trim();
    const reps = currentSet.reps.trim();

    if (weight === '' || reps === '') {
      alert('무게와 횟수를 입력해주세요.');
      return;
    }

    const weightNum = parseFloat(weight);
    const repsNum = parseFloat(reps);

    if (isNaN(weightNum) || weightNum <= 0 || isNaN(repsNum) || repsNum <= 0) {
      alert('올바른 값을 입력해주세요.');
      return;
    }

    const newCompletedState = !currentSet.completed;

    setInputs(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((set, idx) => 
        idx === setIndex ? { ...set, completed: newCompletedState } : set
      )
    }));

    // 세트를 완료(체크)하는 경우에만 타이머 시작
    if (newCompletedState && exercise.rest_seconds) {
      onSetComplete(exercise.rest_seconds);
    }
  }, [program, inputs, onSetComplete]);

  // 현재 운동의 입력이 유효한지 확인 (완료된 세트가 하나 이상 있는지)
  const isCurrentValid = useCallback(() => {
    if (!program) return false;
    const exercise = program.exercises[currentIndex];
    if (!exercise) return false;
    
    const exerciseInputs = inputs[exercise.id] || [];
    return exerciseInputs.some(set => set.completed);
  }, [program, currentIndex, inputs]);

  // 다음 운동으로 이동 (타이머 없음)
  const moveToNextExercise = useCallback(() => {
    if (!program) return;
    
    // 현재 운동의 미완료 세트 확인
    const currentExercise = program.exercises[currentIndex];
    const exerciseInputs = inputs[currentExercise.id] || [];
    const incompleteSets = exerciseInputs.filter(set => !set.completed && (set.weight.trim() !== '' || set.reps.trim() !== ''));
    
    // 미완료 세트가 있으면 확인
    if (incompleteSets.length > 0) {
      const confirmed = window.confirm('입력하지 않은 세트가 있습니다. 다음 운동으로 넘어가시겠습니까?');
      if (!confirmed) {
        return;
      }
      
      // 확인했으면 미완료 세트를 0으로 저장하고 완료 처리
      setInputs(prev => ({
        ...prev,
        [currentExercise.id]: prev[currentExercise.id].map(set => {
          if (!set.completed && (set.weight.trim() !== '' || set.reps.trim() !== '')) {
            return {
              weight: set.weight.trim() || '0',
              reps: set.reps.trim() || '0',
              completed: true,
            };
          }
          return set;
        })
      }));
    }
    
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
  }, [program, currentIndex, inputs, exerciseRefs]);

  // 모든 운동 완료 처리
  const completeAll = useCallback(async () => {
    if (isSaving || !program) return;
    
    setIsSaving(true);
    
    try {
      if (sessionId) {
        for (const exercise of program.exercises) {
          const exerciseInputs = inputs[exercise.id] || [];
          const exerciseNote = notes[exercise.id] || '';
          
          // 모든 세트를 저장 (미완료 세트는 0으로)
          for (let i = 0; i < exerciseInputs.length; i++) {
            const set = exerciseInputs[i];
            const weight = set.completed ? (parseFloat(set.weight) || 0) : 0;
            const reps = set.completed ? (parseInt(set.reps) || 0) : 0;
            
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

  // 입력값 초기화
  const initializeInputs = useCallback((programData: ProgramWithExercises) => {
    const initialInputs: Record<string, SetInput[]> = {};
    const initialNotes: ExerciseNotes = {};
    
    programData.exercises.forEach((exercise) => {
      initialInputs[exercise.id] = Array(exercise.target_sets).fill(null).map(() => ({
        weight: "",
        reps: "",
        completed: false,
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
      toggleSetComplete,
      updateNote,
      isCurrentValid,
      moveToNextExercise,
      completeAll,
      closeModal,
      initializeInputs,
    },
  };
}