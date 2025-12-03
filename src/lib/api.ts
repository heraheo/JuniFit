import { supabase } from '@/lib/supabase';
import type { Program, ProgramExercise } from '@/types/database';

export type ProgramWithExercises = Program & {
  exercises: ProgramExercise[];
  exerciseCount: number;
};

// 모든 프로그램 가져오기
export async function getPrograms(): Promise<ProgramWithExercises[]> {
  // 소프트 삭제: is_archived가 false인 프로그램만 조회
  const { data: programs, error: programsError } = await supabase
    .from('programs')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: true });

  if (programsError) {
    console.error('Error fetching programs:', programsError);
    return [];
  }

  // 각 프로그램의 운동 개수 조회
  const programsWithCount = await Promise.all(
    programs.map(async (program) => {
      const { count } = await supabase
        .from('program_exercises')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', program.id);

      return {
        ...program,
        exercises: [],
        exerciseCount: count || 0,
      };
    })
  );

  return programsWithCount;
}

// ID로 특정 프로그램과 운동 목록 가져오기
export async function getProgramById(id: string): Promise<ProgramWithExercises | null> {
  // 소프트 삭제: is_archived가 false인 프로그램만 조회
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .eq('is_archived', false)
    .single();

  if (programError || !program) {
    console.error('Error fetching program:', programError);
    return null;
  }

  const { data: exercises, error: exercisesError } = await supabase
    .from('program_exercises')
    .select('*')
    .eq('program_id', id)
    .order('order', { ascending: true });

  if (exercisesError) {
    console.error('Error fetching exercises:', exercisesError);
    return null;
  }

  return {
    ...program,
    exercises: exercises || [],
    exerciseCount: exercises?.length || 0,
  };
}

// 운동 세션 생성
export async function createWorkoutSession(programId: string) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      program_id: programId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workout session:', error);
    return null;
  }

  return data;
}

// 운동 세트 기록 저장
export async function saveWorkoutSet(
  sessionId: string,
  exerciseName: string,
  setNumber: number,
  weight: number,
  reps: number,
  rpe?: number
) {
  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      session_id: sessionId,
      exercise_name: exerciseName,
      set_number: setNumber,
      weight,
      reps,
      rpe,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving workout set:', error);
    return null;
  }

  return data;
}

// 운동 세션 완료
export async function completeWorkoutSession(sessionId: string, note?: string) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .update({
      ended_at: new Date().toISOString(),
      note,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error completing workout session:', error);
    return null;
  }

  return data;
}
