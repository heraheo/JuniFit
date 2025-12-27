/**
 * 입력 검증 유틸리티 함수들
 * 프로그램, 템플릿, 운동 기록 등에서 사용되는 공통 검증 로직을 제공
 */

/**
 * 숫자 입력 검증
 * @param value - 검증할 문자열 값
 * @returns 검증 결과 { isValid, error, sanitizedValue }
 */
export function validateNumericInput(value: string): {
  isValid: boolean;
  error?: string;
  sanitizedValue: string;
} {
  if (value === "") {
    return { isValid: true, sanitizedValue: "" };
  }

  if (!/^\d+$/.test(value)) {
    return {
      isValid: false,
      error: "숫자만 입력해주세요",
      sanitizedValue: value,
    };
  }

  return { isValid: true, sanitizedValue: value };
}

/**
 * 운동 기록 입력 검증 (무게, 횟수)
 * @param value - 검증할 문자열 값
 * @param field - 필드 타입 ('weight' | 'reps')
 * @returns 검증 결과 { isValid, error }
 */
export function validateWorkoutInput(
  value: string,
  field: "weight" | "reps"
): { isValid: boolean; error: string | null } {
  if (value.trim() === "") return { isValid: true, error: null };

  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) {
    return {
      isValid: false,
      error:
        field === "weight"
          ? "무게는 양수여야 합니다"
          : "횟수는 양의 정수여야 합니다",
    };
  }

  if (field === "reps" && !Number.isInteger(numValue)) {
    return { isValid: false, error: "횟수는 정수여야 합니다" };
  }

  return { isValid: true, error: null };
}

/**
 * 프로그램 운동 입력 검증
 */
import type { ExercisePart, ExerciseRecordType } from '@/constants/exercise';

export type ProgramExerciseForm = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  recordType: ExerciseRecordType | '';
  targetPart: ExercisePart | '';
  targetSets: string;
  restSeconds: string;
  targetWeight: string;
  targetReps: string;
  targetTime: string;
};

// Backward-compat alias (older code used ExerciseInput)
export type ExerciseInput = ProgramExerciseForm;

/**
 * 운동 입력값의 누락된 필드 확인
 * @param exercise - 검증할 운동 입력값
 * @returns 검증 결과 { isValid, missingFields }
 */
export function validateExerciseInput(exercise: ExerciseInput): {
  isValid: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];

  if (!exercise.exerciseId) missing.push('운동 선택');
  if (exercise.targetSets === '' || Number(exercise.targetSets) < 1) missing.push('세트 수');
  if (exercise.restSeconds === '' || Number(exercise.restSeconds) < 0) missing.push('휴식 시간(초)');

  if (!exercise.recordType) {
    missing.push('기록 타입');
  } else if (exercise.recordType === 'weight_reps') {
    if (exercise.targetWeight === '' || Number(exercise.targetWeight) <= 0) missing.push('목표 무게');
    if (exercise.targetReps === '' || Number(exercise.targetReps) <= 0) missing.push('목표 횟수');
  } else if (exercise.recordType === 'reps_only') {
    if (exercise.targetReps === '' || Number(exercise.targetReps) <= 0) missing.push('목표 횟수');
  } else if (exercise.recordType === 'time') {
    if (exercise.targetTime === '' || Number(exercise.targetTime) <= 0) missing.push('목표 시간(초)');
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * 운동 입력값의 누락된 필드를 요약 메시지로 반환
 * @param exercise - 검증할 운동 입력값
 * @param index - 운동 순서 (선택)
 * @returns 누락된 필드가 있으면 메시지, 없으면 undefined
 */
export function getMissingSummary(
  exercise: ExerciseInput,
  index?: number
): string | undefined {
  const { missingFields } = validateExerciseInput(exercise);
  if (missingFields.length === 0) return undefined;
  return `${missingFields.join(", ")}을 입력해주세요`;
}

/**
 * 프로그램 전체 폼 검증
 * @param title - 프로그램 제목
 * @param description - 프로그램 설명
 * @param exercises - 운동 목록
 * @returns 에러 객체 (에러가 없으면 빈 객체)
 */
export function validateProgramForm(
  title: string,
  description: string,
  exercises: ExerciseInput[]
): {
  title?: string;
  description?: string;
  exercises?: Record<string, { summary?: string }>;
} {
  const errors: {
    title?: string;
    description?: string;
    exercises?: Record<string, { summary?: string }>;
  } = {};

  if (!title.trim()) errors.title = "프로그램 제목을 입력하세요.";
  if (!description.trim()) errors.description = "전체 가이드를 입력하세요.";

  let hasValidExercise = false;
  exercises.forEach((ex, i) => {
    const { isValid, missingFields } = validateExerciseInput(ex);

    if (!isValid) {
      errors.exercises = errors.exercises || {};
      const msg = `${missingFields.join(", ")}을 입력해주세요`;
      errors.exercises[ex.id] = {
        summary: msg || "운동 이름, 세트 수를 입력해주세요",
      };
    } else {
      hasValidExercise = true;
    }
  });

  if (!hasValidExercise) {
    errors.exercises = errors.exercises || {};
  }

  return errors;
}
