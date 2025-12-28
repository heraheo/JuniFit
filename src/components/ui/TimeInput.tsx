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
  disabled,
  className = '',
}: TimeInputProps) {
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  // 초를 분, 초로 변환
  useEffect(() => {
    const totalSeconds = parseInt(value) || 0;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    setMinutes(String(mins));
    setSeconds(String(secs));
  }, [value]);

  const handleMinutesChange = (newMins: string) => {
    if (newMins === '' || /^\d+$/.test(newMins)) {
      setMinutes(newMins);
    }
  };

  const handleSecondsChange = (newSecs: string) => {
    if (newSecs === '' || /^\d+$/.test(newSecs)) {
      // 초는 0-59 사이만 허용
      const numSecs = parseInt(newSecs);
      if (newSecs === '' || (numSecs >= 0 && numSecs <= 59)) {
        setSeconds(newSecs);
      }
    }
  };

  const handleBlur = () => {
    const mins = parseInt(minutes) || 0;
    const secs = parseInt(seconds) || 0;
    const totalSeconds = mins * 60 + secs;
    onChange(String(totalSeconds));
  };

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}

      <div className="flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={minutes}
              onChange={(e) => handleMinutesChange(e.target.value)}
              onBlur={handleBlur}
              disabled={disabled}
              className={`w-full p-2 pr-8 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
              } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
              분
            </span>
          </div>
        </div>

        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={seconds}
              onChange={(e) => handleSecondsChange(e.target.value)}
              onBlur={handleBlur}
              disabled={disabled}
              className={`w-full p-2 pr-8 border rounded-lg text-center font-medium focus:outline-none focus:ring-2 ${
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
              } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
              초
            </span>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
