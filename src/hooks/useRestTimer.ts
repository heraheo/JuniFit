import { useState, useEffect, useCallback, useRef } from 'react';

interface UseRestTimerReturn {
  isOpen: boolean;
  remaining: number;
  total: number;
  start: (seconds: number) => void;
  skip: () => void;
  close: () => void;
}

/**
 * 휴식 타이머 관리 훅
 * @param onComplete - 타이머 완료 시 실행할 콜백 함수
 */
export function useRestTimer(onComplete?: () => void): UseRestTimerReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const onCompleteRef = useRef(onComplete);

  // onComplete 콜백을 ref에 저장하여 의존성 배열에서 제외
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 타이머 카운트다운
  useEffect(() => {
    if (!isOpen || remaining <= 0) return;

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setIsOpen(false);
          // 타이머 완료 시 콜백 실행
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, remaining]);

  // 타이머 시작
  const start = useCallback((seconds: number) => {
    setTotal(seconds);
    setRemaining(seconds);
    setIsOpen(true);
  }, []);

  // 타이머 건너뛰기
  const skip = useCallback(() => {
    setIsOpen(false);
    setRemaining(0);
    if (onCompleteRef.current) {
      onCompleteRef.current();
    }
  }, []);

  // 타이머 닫기 (취소)
  const close = useCallback(() => {
    setIsOpen(false);
    setRemaining(0);
  }, []);

  return {
    isOpen,
    remaining,
    total,
    start,
    skip,
    close,
  };
}