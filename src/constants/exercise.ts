export const EXERCISE_PARTS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'glutes_hams',
  'calves',
  'abs',
  'cardio',
  'full_body',
  'stretching',
] as const;

export type ExercisePart = (typeof EXERCISE_PARTS)[number];

export const PART_LABELS: Record<ExercisePart, string> = {
  chest: '가슴',
  back: '등',
  shoulders: '어깨',
  biceps: '이두',
  triceps: '삼두',
  quads: '대퇴사두',
  glutes_hams: '둔근/햄스트링',
  calves: '종아리',
  abs: '복근',
  cardio: '유산소',
  full_body: '전신',
  stretching: '스트레칭',
};

export const EXERCISE_RECORD_TYPES = ['weight_reps', 'reps_only', 'time'] as const;

export type ExerciseRecordType = (typeof EXERCISE_RECORD_TYPES)[number];

export interface ExerciseMeta {
  id: string;
  name: string;
  target_part: ExercisePart;
  record_type: ExerciseRecordType;
}

interface RecordTypeRequirement {
  requiresWeight: boolean;
  requiresReps: boolean;
  requiresTime: boolean;
}

export const RECORD_TYPE_FIELDS: Record<ExerciseRecordType, RecordTypeRequirement> = {
  weight_reps: {
    requiresWeight: true,
    requiresReps: true,
    requiresTime: false,
  },
  reps_only: {
    requiresWeight: false,
    requiresReps: true,
    requiresTime: false,
  },
  time: {
    requiresWeight: false,
    requiresReps: false,
    requiresTime: true,
  },
};
