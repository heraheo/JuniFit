import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  nickname: string;
  avatar_url?: string;
};

type UseAuthProfileResult = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

export const useAuthProfile = (): UseAuthProfileResult => {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("프로필 조회 오류:", profileError);
        setError(profileError);
        return null;
      }

      setProfile(profileData ?? null);
      return profileData;
    },
    [supabase]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError);
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setUser(currentUser);

    if (currentUser) {
      await fetchProfile(currentUser.id);
    } else {
      setProfile(null);
    }

    setLoading(false);
  }, [fetchProfile, supabase]);

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setError(null);

      if (nextUser) {
        await fetchProfile(nextUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, refresh, supabase]);

  return {
    user,
    profile,
    loading,
    error,
    refresh,
  };
};

export type { Profile };
