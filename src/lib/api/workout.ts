import { createClient } from "@/lib/supabase/client";

export async function createWorkoutSession(programId: string) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Authentication required for creating workout session");
    return null;
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      program_id: programId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating workout session:", error);
    return null;
  }

  return data;
}

export async function saveWorkoutSet(
  sessionId: string,
  exerciseId: string,
  exerciseName: string,
  setNumber: number,
  weight: number | null,
  reps: number | null,
  time: number | null,
  note?: string | null
) {
  const supabase = createClient();

  const insertData = {
    session_id: sessionId,
    exercise_id: exerciseId,
    set_number: setNumber,
    weight,
    reps,
    time,
    note: note ?? null,
  };

  console.log("Saving workout set:", insertData);

  const { data, error } = await supabase
    .from("workout_sets")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Error saving workout set:", error);
    return null;
  }

  return data;
}

export async function completeWorkoutSession(sessionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .update({
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("Error completing workout session:", error);
    return null;
  }

  return data;
}

export async function updateWorkoutSet(
  setId: string,
  weight: number | null,
  reps: number | null,
  time: number | null
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workout_sets")
    .update({
      weight,
      reps,
      time,
    })
    .eq("id", setId)
    .select()
    .single();

  if (error) {
    console.error("Error updating workout set:", error);
    return null;
  }

  return data;
}

export async function deleteWorkoutSession(sessionId: string) {
  const supabase = createClient();
  const { error: setsError } = await supabase
    .from("workout_sets")
    .delete()
    .eq("session_id", sessionId);

  if (setsError) {
    console.error("Error deleting workout sets:", setsError);
    return false;
  }

  const { error: sessionError } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId);

  if (sessionError) {
    console.error("Error deleting workout session:", sessionError);
    return false;
  }

  return true;
}
