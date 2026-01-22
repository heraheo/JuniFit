import { useState, useEffect, useCallback } from "react";

interface AsyncState<T> {
  loading: boolean;
  data: T | null;
  error: Error | null;
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<AsyncState<T>>({
    loading: true,
    data: null,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ loading: true, data: null, error: null });
    try {
      const data = await asyncFn();
      setState({ loading: false, data, error: null });
    } catch (error) {
      setState({ loading: false, data: null, error: error as Error });
    }
  }, [asyncFn]);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setState({ loading: true, data: null, error: null });
      try {
        const data = await asyncFn();
        if (mounted) {
          setState({ loading: false, data, error: null });
        }
      } catch (error) {
        if (mounted) {
          setState({ loading: false, data: null, error: error as Error });
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [asyncFn, deps]);

  return {
    ...state,
    refetch: execute,
  };
}
