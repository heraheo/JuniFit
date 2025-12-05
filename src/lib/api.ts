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

// 운동 기록 조회 (세션 + 세트)
export async function getWorkoutLogs() {
  // 완료된 세션만 조회 (ended_at이 있는 것)
  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('*')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });

  if (sessionsError) {
    console.error('Error fetching workout sessions:', sessionsError);
    return [];
  }

  // 각 세션의 세트 데이터와 프로그램 정보 조회
  const logsWithSets = await Promise.all(
    sessions.map(async (session) => {
      // 세트 조회
      const { data: sets, error: setsError } = await supabase
        .from('workout_sets')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      if (setsError) {
        console.error('Error fetching workout sets:', setsError);
      }

      // 프로그램 제목 조회 (있는 경우)
      let programTitle = undefined;
      if (session.program_id) {
        const { data: program } = await supabase
          .from('programs')
          .select('title')
          .eq('id', session.program_id)
          .single();
        
        if (program) {
          programTitle = program.title;
        }
      }

      return {
        ...session,
        sets: sets || [],
        programTitle,
      };
    })
  );

  return logsWithSets;
}

// 대시보드 데이터 조회
export async function getDashboardData() {
  // 1. 모든 완료된 세션 조회
  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id, started_at, ended_at')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError);
    return null;
  }

  // 2. 모든 세트 데이터 조회 (볼륨 계산용)
  const { data: sets, error: setsError } = await supabase
    .from('workout_sets')
    .select('weight, reps');

  if (setsError) {
    console.error('Error fetching sets:', setsError);
    return null;
  }

  // 3. 이번 달 운동한 날짜들 계산
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthlyWorkoutDates = new Set<number>();
  
  sessions?.forEach((session) => {
    const sessionDate = new Date(session.started_at);
    if (sessionDate.getFullYear() === currentYear && sessionDate.getMonth() === currentMonth) {
      monthlyWorkoutDates.add(sessionDate.getDate());
    }
  });

  // 4. 총 볼륨 계산 (weight * reps)
  const totalVolume = sets?.reduce((acc, set) => {
    return acc + (set.weight || 0) * (set.reps || 0);
  }, 0) || 0;

  return {
    totalSessions: sessions?.length || 0,
    thisMonthCount: monthlyWorkoutDates.size,
    monthlyWorkoutDates: Array.from(monthlyWorkoutDates),
    totalVolume,
    currentYear,
    currentMonth,
  };
}

// 특정 운동 기록 조회 (ID로)
export async function getWorkoutLogById(sessionId: string) {
  // 세션 조회
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    console.error('Error fetching workout session:', sessionError);
    return null;
  }

  // 세트 조회
  const { data: sets, error: setsError } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (setsError) {
    console.error('Error fetching workout sets:', setsError);
  }

  // 프로그램 제목 및 운동 목록 조회
  let programTitle = undefined;
  let programExercises: ProgramExercise[] = [];
  if (session.program_id) {
    console.log('[API] Fetching program for program_id:', session.program_id);
    
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('title')
      .eq('id', session.program_id)
      .single();
    
    if (programError) {
      console.error('[API] Error fetching program:', programError);
    }
    
    if (program) {
      programTitle = program.title;
      console.log('[API] Program title:', programTitle);
    }

    // 프로그램의 운동 목록 조회
    const { data: exercises, error: exercisesError } = await supabase
      .from('program_exercises')
      .select('*')
      .eq('program_id', session.program_id)
      .order('order', { ascending: true });
    
    if (exercisesError) {
      console.error('[API] Error fetching program exercises:', exercisesError);
    }
    
    if (exercises) {
      programExercises = exercises;
      console.log('[API] Program exercises loaded:', exercises.length, 'exercises');
      console.log('[API] Exercises:', exercises.map(e => `${e.name} (${e.target_sets} sets)`));
    } else {
      console.warn('[API] No exercises found for program_id:', session.program_id);
    }
  } else {
    console.warn('[API] No program_id in session');
  }

  console.log('[API] Returning workout log with:', {
    sessionId: session.id,
    programId: session.program_id,
    programTitle,
    exercisesCount: programExercises.length,
    setsCount: sets?.length || 0
  });

  return {
    ...session,
    sets: sets || [],
    programTitle,
    programExercises,
  };
}

// 운동 세션 삭제 (Hard Delete)
export async function deleteWorkoutSession(sessionId: string) {
  // 먼저 세트 삭제
  const { error: setsError } = await supabase
    .from('workout_sets')
    .delete()
    .eq('session_id', sessionId);

  if (setsError) {
    console.error('Error deleting workout sets:', setsError);
    return false;
  }

  // 세션 삭제
  const { error: sessionError } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId);

  if (sessionError) {
    console.error('Error deleting workout session:', sessionError);
    return false;
  }

  return true;
}

// 운동 세트 수정
export async function updateWorkoutSet(
  setId: string,
  weight: number,
  reps: number,
  rpe?: number
) {
  const { data, error } = await supabase
    .from('workout_sets')
    .update({
      weight,
      reps,
      rpe,
    })
    .eq('id', setId)
    .select()
    .single();

  if (error) {
    console.error('Error updating workout set:', error);
    return null;
  }

  return data;
}

// 세션 노트 수정
export async function updateSessionNote(sessionId: string, note: string) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .update({ note })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating session note:', error);
    return null;
  }

  return data;
}
