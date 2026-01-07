// 1. 프로그램 (Programs)
export type Program = {
  id: string;
  title: string;
  description?: string;
  rpe?: number;
  created_at: string;
};

// 2. 프로그램 구성 운동 (Program Exercises)
import type { ExercisePart, ExerciseRecordType } from '@/constants/exercise';

export type ProgramExercise = {
  id: string;
  program_id: string;
  exercise_id: string;
  target_sets: number | null;
  target_reps: number | null;
  target_weight: number | null;
  target_time: number | null;
  rest_seconds: number | null;
  order: number;
  created_at: string | null;

  // Joined exercise metadata (resolved for UI)
  name: string;
  target_part: ExercisePart;
  record_type: ExerciseRecordType;
};

// 3. 운동 세션 (Workout Sessions)
export type WorkoutSession = {
  id: string;
  program_id?: string;
  exercise_id?: string | null;
  started_at: string;
  ended_at?: string;
};

// 4. 세트별 수행 기록 (Workout Sets)
export type WorkoutSet = {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name?: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  time: number | null;
  note: string | null;
  created_at: string | null;
  // 운동 타입 (히스토리 표시용)
  record_type?: string;
};

// 5. 운동 기록 상세 (Workout Log Detail) - API 응답용
export type WorkoutLogDetail = WorkoutSession & {
  sets: WorkoutSet[];
  programTitle?: string;
  programExercises?: Array<{
    id: string;
    name: string;
    target_sets: number | null;
    target_reps: number | null;
    target_weight?: number | null;
    target_time?: number | null;
    order: number;
    rest_seconds?: number | null;
  }>;
};
