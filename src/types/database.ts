// 1. 프로그램 (Programs)
export type Program = {
  id: string;
  title: string;
  description?: string;
  created_at: string;
};

// 2. 프로그램 구성 운동 (Program Exercises)
export type ProgramExercise = {
  id: string;
  program_id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  rest_seconds?: number;
  intention?: string;
  note?: string;
  order: number;
  created_at: string;
};

// 3. 운동 세션 (Workout Sessions)
export type WorkoutSession = {
  id: string;
  program_id?: string;
  started_at: string;
  ended_at?: string;
  note?: string;
};

// 4. 세트별 수행 기록 (Workout Sets)
export type WorkoutSet = {
  id: string;
  session_id: string;
  exercise_name: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  note?: string | null;
  created_at: string;
};

// 5. 운동 기록 상세 (Workout Log Detail) - API 응답용
export type WorkoutLogDetail = WorkoutSession & {
  sets: WorkoutSet[];
  programTitle?: string;
  programExercises?: Array<{
    id: string;
    name: string;
    target_sets: number;
    target_reps: number;
    order: number;
    rest_seconds?: number | null;
    intention?: string | null;
    note?: string | null;
  }>;
};
