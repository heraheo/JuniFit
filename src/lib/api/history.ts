import { createClient } from "@/lib/supabase/client";

export async function getWorkoutLogs(limit?: number, offset: number = 0) {
  const supabase = createClient();

  let query = supabase
    .from("workout_sessions")
    .select("*")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false });

  if (limit !== undefined) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data: sessions, error: sessionsError } = await query;

  if (sessionsError) {
    console.error("Error fetching workout sessions:", sessionsError);
    return [];
  }

  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((session) => session.id);
  const programIds = [...new Set(sessions.map((session) => session.program_id).filter(Boolean))];

  const [setsResult, exercisesResult, programsResult] = await Promise.all([
    supabase
      .from("workout_sets")
      .select("*")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true }),
    programIds.length > 0
      ? supabase
          .from("program_exercises")
          .select("program_id, exercise_id, order, exercises ( name )")
          .in("program_id", programIds)
      : Promise.resolve({ data: [] }),
    programIds.length > 0
      ? supabase.from("programs").select("id, title").in("id", programIds)
      : Promise.resolve({ data: [] }),
  ]);

  const setsBySession: Record<string, any[]> = {};
  setsResult.data?.forEach((set) => {
    if (!setsBySession[set.session_id]) setsBySession[set.session_id] = [];
    setsBySession[set.session_id].push(set);
  });

  const exerciseOrderByProgram: Record<string, Record<string, number>> = {};
  const exerciseRecordTypeByProgram: Record<string, Record<string, string>> = {};
  exercisesResult.data?.forEach((ex: any) => {
    if (!exerciseOrderByProgram[ex.program_id]) exerciseOrderByProgram[ex.program_id] = {};
    if (!exerciseRecordTypeByProgram[ex.program_id]) exerciseRecordTypeByProgram[ex.program_id] = {};

    exerciseOrderByProgram[ex.program_id][ex.exercise_id] = ex.order || 999;

    const meta = Array.isArray(ex.exercises) ? ex.exercises[0] : ex.exercises;
    exerciseRecordTypeByProgram[ex.program_id][ex.exercise_id] = meta?.record_type || "";
  });

  const programTitleMap: Record<string, string> = {};
  programsResult.data?.forEach((program) => {
    programTitleMap[program.id] = program.title;
  });

  return sessions.map((session) => {
    const sets = setsBySession[session.id] || [];
    const exerciseOrderMap = session.program_id ? exerciseOrderByProgram[session.program_id] || {} : {};
    const exerciseRecordTypeMap = session.program_id
      ? exerciseRecordTypeByProgram[session.program_id] || {}
      : {};

    const sortedSets = sets
      .sort((a, b) => {
        const orderA = exerciseOrderMap[a.exercise_id] || 999;
        const orderB = exerciseOrderMap[b.exercise_id] || 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.set_number - b.set_number;
      })
      .map((set) => ({
        ...set,
        record_type: exerciseRecordTypeMap[set.exercise_id] || "",
      }));

    return {
      ...session,
      sets: sortedSets,
      programTitle: session.program_id ? programTitleMap[session.program_id] : undefined,
    };
  });
}

export async function getDashboardData() {
  const supabase = createClient();
  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false });

  if (sessionsError) {
    console.error("Error fetching sessions:", sessionsError);
    return null;
  }

  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("weight, reps");

  if (setsError) {
    console.error("Error fetching sets:", setsError);
    return null;
  }

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

  const totalVolume =
    sets?.reduce((acc, set) => {
      const weight = set.weight || 0;
      const reps = set.reps || 0;
      return acc + weight * reps;
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

export async function getWorkoutLogById(sessionId: string) {
  const supabase = createClient();

  const [sessionResult, setsResult] = await Promise.all([
    supabase.from("workout_sessions").select("*").eq("id", sessionId).single(),
    supabase
      .from("workout_sets")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  const { data: session, error: sessionError } = sessionResult;
  const { data: sets, error: setsError } = setsResult;

  if (sessionError || !session) {
    console.error("Error fetching workout session:", sessionError);
    return null;
  }

  if (setsError) {
    console.error("Error fetching workout sets:", setsError);
  }

  let exerciseOrderMap: Record<string, number> = {};
  let exerciseRecordTypeMap: Record<string, string> = {};
  let programTitle = undefined;

  if (session.program_id) {
    const [exercisesResult, programResult] = await Promise.all([
      supabase
        .from("program_exercises")
        .select("exercise_id, order, exercises ( name, record_type )")
        .eq("program_id", session.program_id),
      supabase.from("programs").select("title").eq("id", session.program_id).single(),
    ]);

    if (exercisesResult.data) {
      exercisesResult.data.forEach((ex: any) => {
        exerciseOrderMap[ex.exercise_id] = ex.order || 999;
        const meta = Array.isArray(ex.exercises) ? ex.exercises[0] : ex.exercises;
        exerciseRecordTypeMap[ex.exercise_id] = meta?.record_type || "";
      });
    }

    if (programResult.data) {
      programTitle = programResult.data.title;
    }
  }

  const sortedSets =
    sets
      ?.sort((a, b) => {
        const orderA = exerciseOrderMap[a.exercise_id] || 999;
        const orderB = exerciseOrderMap[b.exercise_id] || 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.set_number - b.set_number;
      })
      .map((set) => ({
        ...set,
        record_type: exerciseRecordTypeMap[set.exercise_id] || "",
      })) || [];

  return {
    ...session,
    sets: sortedSets,
    programTitle,
  };
}
