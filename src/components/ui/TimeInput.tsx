'use client';

import { useState, useEffect } from 'react';

interface TimeInputProps {
  label?: string;
  value: string;
  onChange: (seconds: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function TimeInput({
  label,
  value,
  onChange,
  error,
  placeholder = '0',
  disabled,
  className = '',
}: TimeInputProps) {
  const [unit, setUnit] = useState<'seconds' | 'minutes'>('seconds');
  const [inputValue, setInputValue] = useState(value);

  // 초를 분:초로 변환
  const secondsToMinutesAndSeconds = (seconds: number): { mins: number; secs: number } => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { mins, secs };
  };

  // 분:초를 초로 변환
  const minutesAndSecondsToSeconds = (mins: number, secs: number): number => {
    return mins * 60 + secs;
  };

  // 초기화 또는 value 변경 시
  useEffect(() => {
    const totalSeconds = parseInt(value) || 0;

    if (totalSeconds >= 60) {
      setUnit('minutes');
      const { mins, secs } = secondsToMinutesAndSeconds(totalSeconds);
      setInputValue(String(mins * 100 + secs)); // 분*100 + 초 형식으로 저장 (예: 130 → 1분30초)
    } else {
      setUnit('seconds');
      setInputValue(String(totalSeconds));
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    setInputValue(newValue);

    if (unit === 'seconds') {
      onChange(newValue);
    } else {
      // 분 단위일 경우 변환 필요 없음 (변환은 handleBlur에서 처리)
    }
  };

  const handleBlur = () => {
    if (unit === 'minutes') {
      const numValue = parseInt(inputValue) || 0;
      const mins = Math.floor(numValue / 100);
      const secs = numValue % 100;
      const totalSeconds = minutesAndSecondsToSeconds(mins, secs);
      onChange(String(totalSeconds));
    }
  };

  const handleUnitChange = (newUnit: 'seconds' | 'minutes') => {
    const totalSeconds = parseInt(value) || 0;
    setUnit(newUnit);

    if (newUnit === 'minutes' && totalSeconds >= 60) {
      const { mins, secs } = secondsToMinutesAndSeconds(totalSeconds);
      setInputValue(String(mins * 100 + secs));
    } else if (newUnit === 'seconds') {
      setInputValue(String(totalSeconds));
    }
  };

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}

      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              if (e.target.value === '' || /^\d+$/.test(e.target.value)) {
                handleChange(e.target.value);
              }
            }}
            onBlur={handleBlur}
            disabled={disabled}
            className={`w-full p-2 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleUnitChange('seconds')}
            className={`px-3 py-2 rounded-lg border transition-all text-sm font-medium ${
              unit === 'seconds'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
            }`}
            disabled={disabled}
          >
            초
          </button>
          <button
            type="button"
            onClick={() => handleUnitChange('minutes')}
            className={`px-3 py-2 rounded-lg border transition-all text-sm font-medium ${
              unit === 'minutes'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
            }`}
            disabled={disabled}
          >
            분
          </button>
        </div>
      </div>

      {unit === 'minutes' && (
        <p className="text-xs text-slate-500 mt-1">
          {inputValue ? `${Math.floor(parseInt(inputValue) / 100)}분 ${parseInt(inputValue) % 100}초` : '0분0초'}
        </p>
      )}

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
