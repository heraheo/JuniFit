// 데이터베이스 테이블 이름
export const TABLE_NAMES = {
  PROFILES: 'profiles',
  PROGRAMS: 'programs',
  PROGRAM_EXERCISES: 'program_exercises',
  WORKOUT_SESSIONS: 'workout_sessions',
  WORKOUT_SETS: 'workout_sets',
} as const;

// 기본 운동 설정값
export const WORKOUT_DEFAULTS = {
  REST_SECONDS: 90,
  TARGET_SETS: 3,
  TARGET_REPS: 10,
  MIN_REPS: 8,
  MAX_REPS: 12,
} as const;

// RPE (Rate of Perceived Exertion) 범위
export const RPE = {
  MIN: 1,
  MAX: 10,
} as const;

// 아바타 설정
export const AVATAR = {
  API_BASE: 'https://api.dicebear.com/9.x/notionists/svg',
  DEFAULT_SEED: 'default',
} as const;

// 앱 메타데이터
export const APP = {
  NAME: 'JuniFit',
  DESCRIPTION: '개인 운동 기록 및 관리 웹 앱',
} as const;

// 유효성 검사 메시지
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: '필수 입력 항목입니다',
  INVALID_NUMBER: '올바른 숫자를 입력해주세요',
  POSITIVE_NUMBER: '양수를 입력해주세요',
  INTEGER_ONLY: '정수만 입력 가능합니다',
} as const;
