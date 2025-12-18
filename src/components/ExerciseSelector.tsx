'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import { PART_LABELS, type ExerciseMeta } from '@/constants/exercise';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ExerciseSelectorProps {
  label?: string;
  helperText?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  value?: ExerciseMeta | null;
  onSelect: (exercise: ExerciseMeta) => void;
  onClear?: () => void;
}

const RESULT_LIMIT = 20;

function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, char => `\\${char}`);
}

export default function ExerciseSelector({
  label = '운동 검색',
  helperText,
  error,
  placeholder = '운동명을 입력하세요',
  disabled,
  value,
  onSelect,
  onClear,
}: ExerciseSelectorProps) {
  const supabase = useMemo(() => createClient(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.name ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [results, setResults] = useState<ExerciseMeta[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value?.id, value?.name]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let isActive = true;

    async function fetchExercises() {
      if (disabled) return;
      setIsLoading(true);
      setFetchError(null);

      try {
        let builder = supabase
          .from('exercises')
          .select('id,name,target_part,record_type', { count: 'exact' })
          .order('name', { ascending: true })
          .limit(RESULT_LIMIT);

        const trimmed = debouncedQuery.trim();
        if (trimmed) {
          const escaped = escapeIlike(trimmed);
          builder = builder.or(`name.ilike.%${escaped}%,aliases.ilike.%${escaped}%`);
        }

        const { data, error: queryError } = await builder;
        if (!isActive) return;

        if (queryError) {
          setFetchError('운동 목록을 불러오지 못했습니다.');
          setResults([]);
        } else {
          setResults(data ?? []);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    fetchExercises();

    return () => {
      isActive = false;
    };
  }, [debouncedQuery, disabled, supabase]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (exercise: ExerciseMeta) => {
      onSelect(exercise);
      setQuery(exercise.name);
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    onClear?.();
    setIsOpen(true);
  }, [onClear]);

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        label={label}
        helperText={helperText}
        error={error}
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onChange={event => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="pl-10"
      />

      <Search className="absolute left-3 top-10 h-5 w-5 text-slate-400" />
      {value && !disabled && (
        <button
          type="button"
          className="absolute right-3 top-10 text-slate-400 hover:text-slate-600"
          onClick={handleClear}
          aria-label="선택 초기화"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {isOpen && !disabled && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          {isLoading ? (
            <LoadingSpinner message="검색 중..." size="sm" className="py-6" />
          ) : fetchError ? (
            <p className="px-4 py-3 text-sm text-red-600">{fetchError}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">검색 결과가 없습니다.</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-2">
              {results.map(exercise => (
                <li key={exercise.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50',
                      value?.id === exercise.id && 'bg-blue-50'
                    )}
                    onClick={() => handleSelect(exercise)}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{exercise.name}</p>
                      <p className="text-xs text-slate-500">{exercise.record_type}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {PART_LABELS[exercise.target_part]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
