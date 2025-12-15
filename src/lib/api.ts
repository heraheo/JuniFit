import { createClient } from '@/lib/supabase/server';
import type { Program, ProgramExercise } from '@/types/database';

export type ProgramWithExercises = Program & {
  exercises: ProgramExercise[];
  exerciseCount: number;
};

// 모든 프로그램 가져오기
export async function getPrograms(): Promise<ProgramWithExercises[]> {
  const supabase = await createClient();
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

  // 모든 프로그램의 운동 개수를 한 번에 조회 (N+1 문제 해결)
  if (programs.length === 0) return [];

  const { data: allExercises } = await supabase
    .from('program_exercises')
    .select('program_id')
    .in('program_id', programs.map(p => p.id));

  // 프로그램별 운동 개수 집계
  const exerciseCountMap: Record<string, number> = {};
  allExercises?.forEach(ex => {
    exerciseCountMap[ex.program_id] = (exerciseCountMap[ex.program_id] || 0) + 1;
  });

  const programsWithCount = programs.map(program => ({
    ...program,
    exercises: [],
    exerciseCount: exerciseCountMap[program.id] || 0,
  }));

  return programsWithCount;
}

// ID로 특정 프로그램과 운동 목록 가져오기
export async function getProgramById(id: string): Promise<ProgramWithExercises | null> {
  const supabase = await createClient();
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
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Authentication required for creating workout session');
    return null;
  }

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: user.id,
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
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Authentication required for saving workout set');
    return null;
  }

  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      user_id: user.id,
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
  const supabase = await createClient();
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

// 운동 기록 조회 (세션 + 세트) - 페이지네이션 지원
export async function getWorkoutLogs(limit?: number, offset: number = 0) {
  const supabase = await createClient();
  
  // 완료된 세션만 조회 (ended_at이 있는 것)
  let query = supabase
    .from('workout_sessions')
    .select('*')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });

  // 페이지네이션 적용
  if (limit !== undefined) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data: sessions, error: sessionsError } = await query;

  if (sessionsError) {
    console.error('Error fetching workout sessions:', sessionsError);
    return [];
  }

  // N+1 문제 해결: 모든 세션의 데이터를 한 번에 조회
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map(s => s.id);
  const programIds = [...new Set(sessions.map(s => s.program_id).filter(Boolean))];

  // 모든 쿼리를 병렬로 실행 (31번 → 4번)
  const [setsResult, exercisesResult, programsResult] = await Promise.all([
    supabase.from('workout_sets').select('*').in('session_id', sessionIds).order('created_at', { ascending: true }),
    programIds.length > 0 ? supabase.from('program_exercises').select('program_id, name, order').in('program_id', programIds) : Promise.resolve({ data: [] }),
    programIds.length > 0 ? supabase.from('programs').select('id, title').in('id', programIds) : Promise.resolve({ data: [] }),
  ]);

  // 세션별 세트 그룹화
  const setsBySession: Record<string, any[]> = {};
  setsResult.data?.forEach(set => {
    if (!setsBySession[set.session_id]) setsBySession[set.session_id] = [];
    setsBySession[set.session_id].push(set);
  });

  // 프로그램별 운동 순서 맵
  const exerciseOrderByProgram: Record<string, Record<string, number>> = {};
  exercisesResult.data?.forEach(ex => {
    if (!exerciseOrderByProgram[ex.program_id]) exerciseOrderByProgram[ex.program_id] = {};
    exerciseOrderByProgram[ex.program_id][ex.name] = ex.order || 999;
  });

  // 프로그램 제목 맵
  const programTitleMap: Record<string, string> = {};
  programsResult.data?.forEach(p => {
    programTitleMap[p.id] = p.title;
  });

  // 각 세션 데이터 조합
  const logsWithSets = sessions.map(session => {
    const sets = setsBySession[session.id] || [];
    const exerciseOrderMap = session.program_id ? exerciseOrderByProgram[session.program_id] || {} : {};

    // 세트를 운동 순서대로 정렬
    const sortedSets = sets.sort((a, b) => {
      const orderA = exerciseOrderMap[a.exercise_name] || 999;
      const orderB = exerciseOrderMap[b.exercise_name] || 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.set_number - b.set_number;
    });

    return {
      ...session,
      sets: sortedSets,
      programTitle: session.program_id ? programTitleMap[session.program_id] : undefined,
    };
  });

  return logsWithSets;
}

// 대시보드 데이터 조회
export async function getDashboardData() {
  const supabase = await createClient();
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
  const supabase = await createClient();
  
  // 1단계: 세션과 세트를 병렬로 조회 (Waterfall 제거)
  const [sessionResult, setsResult] = await Promise.all([
    supabase.from('workout_sessions').select('*').eq('id', sessionId).single(),
    supabase.from('workout_sets').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
  ]);

  const { data: session, error: sessionError } = sessionResult;
  const { data: sets, error: setsError } = setsResult;

  if (sessionError || !session) {
    console.error('Error fetching workout session:', sessionError);
    return null;
  }

  if (setsError) {
    console.error('Error fetching workout sets:', setsError);
  }

  // 2단계: program_id가 있으면 프로그램 정보를 병렬로 조회
  let exerciseOrderMap: Record<string, number> = {};
  let programTitle = undefined;

  if (session.program_id) {
    const [exercisesResult, programResult] = await Promise.all([
      supabase.from('program_exercises').select('name, order').eq('program_id', session.program_id),
      supabase.from('programs').select('title').eq('id', session.program_id).single(),
    ]);

    if (exercisesResult.data) {
      exercisesResult.data.forEach(ex => {
        exerciseOrderMap[ex.name] = ex.order || 999;
      });
    }

    if (programResult.data) {
      programTitle = programResult.data.title;
    }
  }

  // 세트를 운동 순서대로 정렬
  const sortedSets = sets?.sort((a, b) => {
    const orderA = exerciseOrderMap[a.exercise_name] || 999;
    const orderB = exerciseOrderMap[b.exercise_name] || 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.set_number - b.set_number;
  }) || [];

  return {
    ...session,
    sets: sortedSets,
    programTitle,
  };
}

// 운동 세션 삭제 (Hard Delete)
export async function deleteWorkoutSession(sessionId: string) {
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
