// DB 테이블 타입 정의
export interface Program {
  id: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface ProgramExercise {
  id: string;
  program_id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  rest_seconds: number;
  intention?: string;
  note?: string;
  order: number;
}

// UI에서 사용하는 타입 (기존 호환성 유지)
export interface ExerciseTemplate {
  id?: string; // 선택적 식별자 (UUID 등)
  name: string; // 운동명
  target: {
    sets: number; // 목표 세트 수
    reps: number; // 세트당 목표 횟수
  };
  restSeconds: number; // 휴식 시간(초)
  intention?: string; // 의도 (예: 근력, 지구력)
  note?: string; // 전체 가이드 / 노트
}

export interface WorkoutTemplate {
  id: string; // 템플릿 ID (UUID 등)
  title: string; // 템플릿 제목
  description?: string;
  createdAt?: string; // ISO 날짜 문자열
  exercises: ExerciseTemplate[];
}

// 로그 타입은 필요 시 별도 파일로 분리하세요.