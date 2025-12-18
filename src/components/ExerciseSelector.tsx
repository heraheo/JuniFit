'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import { EXERCISE_PARTS, PART_LABELS, type ExerciseMeta, type ExercisePart } from '@/constants/exercise';
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
const FETCH_LIMIT = 2000;

type ExerciseOption = ExerciseMeta & {
  aliases?: string[] | null;
  description?: string | null;
  effects?: string | null;
};

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()\[\]{}.,/\\-]/g, '');
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
  const [results, setResults] = useState<ExerciseOption[]>([]);
  const [candidates, setCandidates] = useState<ExerciseOption[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<ExerciseOption | null>(null);
  const [partFilter, setPartFilter] = useState<ExercisePart | 'all'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value?.id, value?.name]);

  useEffect(() => {
    let isActive = true;

    async function loadSelectedDetail() {
      if (!value?.id) {
        setSelectedDetail(null);
        return;
      }

      // Prefer local candidate cache first.
      const local = candidates.find(c => c.id === value.id);
      if (local) {
        setSelectedDetail(local);
        return;
      }

      const { data, error } = await supabase
        .from('exercises')
        .select('id,name,target_part,record_type,description,effects')
        .eq('id', value.id)
        .single();

      if (!isActive) return;
      if (error || !data) return;

      setSelectedDetail(data as ExerciseOption);
    }

    loadSelectedDetail();

    return () => {
      isActive = false;
    };
  }, [value?.id, candidates, supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch candidates by target_part first (and enough rows), then do client-side search.
  // This avoids missing results due to low limits and because partial matching against aliases(text[]) isn't reliable via ilike.
  useEffect(() => {
    let isActive = true;

    async function fetchExercises() {
      if (disabled) return;
      setIsLoading(true);
      setFetchError(null);

      try {
        let builder = supabase
          .from('exercises')
          .select('id,name,target_part,record_type,aliases,description,effects')
          .order('name', { ascending: true })
          .limit(FETCH_LIMIT);

        if (partFilter !== 'all') {
          builder = builder.eq('target_part', partFilter);
        }

        const { data, error: queryError } = await builder;
        if (!isActive) return;

        if (queryError) {
          setFetchError('운동 목록을 불러오지 못했습니다.');
          setCandidates([]);
          setResults([]);
          return;
        }

        const fetched = (data ?? []) as ExerciseOption[];
        setCandidates(fetched);
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
  }, [disabled, supabase, partFilter]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    const normalized = normalizeSearch(trimmed);

    if (!trimmed) {
      setResults(candidates.slice(0, RESULT_LIMIT));
      return;
    }

    const filtered = candidates.filter(ex => {
      const name = ex.name ?? '';
      const aliases = ex.aliases ?? [];

      const haystack = [name, ...aliases].filter(Boolean);
      return haystack.some(text => {
        const t = String(text);
        if (t.includes(trimmed)) return true;
        if (t.toLowerCase().includes(trimmed.toLowerCase())) return true;
        return normalizeSearch(t).includes(normalized);
      });
    });

    setResults(filtered.slice(0, 50));
  }, [debouncedQuery, candidates]);

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
    (exercise: ExerciseOption) => {
      onSelect({
        id: exercise.id,
        name: exercise.name,
        record_type: exercise.record_type,
        target_part: exercise.target_part,
      });
      setSelectedDetail(exercise);
      setQuery(exercise.name);
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setDebouncedQuery('');
    setSelectedDetail(null);
    onClear?.();
    setIsOpen(true);
  }, [onClear]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-end gap-3">
        <div className="w-36">
          <label className="block text-sm font-medium text-slate-700 mb-2">부위</label>
          <select
            className={cn(
              'w-full px-4 py-3 border rounded-lg text-base',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'transition-all',
              error ? 'border-red-500' : 'border-slate-300'
            )}
            value={partFilter}
            onChange={e => {
              setPartFilter(e.target.value as ExercisePart | 'all');
              setIsOpen(true);
            }}
            disabled={disabled}
          >
            <option value="all">전체</option>
            {EXERCISE_PARTS.map(part => (
              <option key={part} value={part}>
                {PART_LABELS[part]}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1">
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
        </div>
      </div>

      {(selectedDetail?.description || selectedDetail?.effects) && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          {selectedDetail.description && (
            <p className="text-xs text-slate-700">
              <span className="font-medium">설명:</span> {selectedDetail.description}
            </p>
          )}
          {selectedDetail.effects && (
            <p className={cn('text-xs text-slate-700', selectedDetail.description && 'mt-1')}>
              <span className="font-medium">효과:</span> {selectedDetail.effects}
            </p>
          )}
        </div>
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
