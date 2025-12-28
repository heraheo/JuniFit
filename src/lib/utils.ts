// 한국 시간(KST) 포맷팅 유틸리티
export function formatKoreanDateTime(dateString: string): string {
  const date = new Date(dateString);
  
  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(/\. /g, '. ');
}

// 간단한 날짜 포맷 (YYYY. MM. DD.)
export function formatSimpleDate(dateString: string): string {
  const date = new Date(dateString);
  
  return date.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 시간만 포맷 (오전/오후 HH:MM)
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  
  return date.toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// 날짜 + 요일 포맷 (YYYY년 M월 D일 (요일))
export function formatDateWithWeekday(dateString: string): string {
  const date = new Date(dateString);
  
  return date.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
}

// 초를 MM:SS 형식으로 변환
export function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 초를 읽기 좋은 형식으로 변환 (예: 90초 → 1분30초)
export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds == null) return '0분';
  if (seconds === 0) return '0초';

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) return `${secs}초`;
  if (secs === 0) return `${mins}분`;
  return `${mins}분${secs}초`;
}

// 운동 지속 시간 계산
export function calculateDuration(startedAt: string, endedAt?: string | null): string {
  if (!endedAt) return "진행 중";
  
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}분`;
  }
  
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}시간 ${mins}분`;
}

// 숫자를 천 단위 콤마로 포맷
export function formatNumber(num: number): string {
  return num.toLocaleString("ko-KR");
}

// 클래스명 병합 유틸리티
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// 세트를 운동별로 그룹화 (제네릭)
export function groupSetsByExercise<T extends { exercise_name?: string }>(
  sets: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  sets.forEach((set) => {
    const exerciseName = set.exercise_name || '';
    if (!grouped[exerciseName]) {
      grouped[exerciseName] = [];
    }
    grouped[exerciseName].push(set);
  });
  return grouped;
}
