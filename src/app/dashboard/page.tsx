"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Dumbbell, TrendingUp, CheckCircle } from "lucide-react";
import { getDashboardData } from "@/lib/api";

type DashboardData = {
  totalSessions: number;
  thisMonthCount: number;
  monthlyWorkoutDates: number[];
  totalVolume: number;
  currentYear: number;
  currentMonth: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getDashboardData();
      setData(result);
      setLoading(false);
    }
    fetchData();
  }, []);

  // 달력 생성 함수
  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = 일요일

    const days: (number | null)[] = [];

    // 첫 주 빈칸 채우기
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 날짜 채우기
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  // 숫자 포맷팅 (천 단위 콤마)
  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  // 월 이름 가져오기
  const getMonthName = (month: number) => {
    const months = [
      "1월", "2월", "3월", "4월", "5월", "6월",
      "7월", "8월", "9월", "10월", "11월", "12월"
    ];
    return months[month];
  };

  const today = new Date();
  const todayDate = today.getDate();
  const isCurrentMonth = data
    ? today.getFullYear() === data.currentYear && today.getMonth() === data.currentMonth
    : false;

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
        <div className="max-w-md mx-auto">
          <header className="flex items-center mb-6">
            <Link href="/" className="text-slate-600 mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">나의 운동 대시보드</h1>
          </header>
          <div className="text-center py-12">
            <p className="text-slate-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
        <div className="max-w-md mx-auto">
          <header className="flex items-center mb-6">
            <Link href="/" className="text-slate-600 mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">나의 운동 대시보드</h1>
          </header>
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <p className="text-slate-600">데이터를 불러오는데 실패했습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays(data.currentYear, data.currentMonth);
  const workoutDatesSet = new Set(data.monthlyWorkoutDates);

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">나의 운동 대시보드</h1>
            <p className="text-sm text-slate-600">꾸준함이 실력이 됩니다 💪</p>
          </div>
        </header>

        {/* 요약 통계 카드 */}
        <section className="grid grid-cols-3 gap-3 mb-6">
          {/* 이번 달 운동 횟수 */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full mb-2">
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{data.thisMonthCount}회</p>
            <p className="text-xs text-green-100 mt-1">이번 달 출석</p>
          </div>

          {/* 총 누적 운동 횟수 */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full mb-2">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{data.totalSessions}회</p>
            <p className="text-xs text-blue-100 mt-1">총 운동 완료</p>
          </div>

          {/* 총 누적 볼륨 */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full mb-2">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-lg font-bold">
              {data.totalVolume >= 1000
                ? `${formatNumber(Math.round(data.totalVolume / 1000))}t`
                : `${formatNumber(data.totalVolume)}kg`}
            </p>
            <p className="text-xs text-purple-100 mt-1">누적 볼륨</p>
          </div>
        </section>

        {/* 이번 달 운동 달력 */}
        <section className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {data.currentYear}년 {getMonthName(data.currentMonth)} 출석 현황
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-slate-600">운동 완료</span>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
              <div
                key={day}
                className={`text-center text-xs font-medium py-2 ${
                  index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-slate-500"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square"></div>;
              }

              const isWorkoutDay = workoutDatesSet.has(day);
              const isToday = isCurrentMonth && day === todayDate;
              const dayOfWeek = (index % 7);
              const isSunday = dayOfWeek === 0;
              const isSaturday = dayOfWeek === 6;

              return (
                <div
                  key={day}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    isWorkoutDay
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-gray-50 text-slate-700"
                  } ${
                    isToday
                      ? "ring-2 ring-offset-1 ring-blue-500"
                      : ""
                  } ${
                    !isWorkoutDay && isSunday ? "text-red-400" : ""
                  } ${
                    !isWorkoutDay && isSaturday ? "text-blue-400" : ""
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* 이번 달 요약 메시지 */}
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm text-green-800 text-center">
              {data.thisMonthCount === 0 ? (
                <>오늘부터 시작해보세요! 🏃‍♂️</>
              ) : data.thisMonthCount < 5 ? (
                <>좋은 시작이에요! 계속 화이팅! 💪</>
              ) : data.thisMonthCount < 10 ? (
                <>대단해요! 꾸준히 운동하고 계시네요! 🔥</>
              ) : data.thisMonthCount < 20 ? (
                <>정말 성실하시네요! 이번 달 {data.thisMonthCount}회 출석! 🏆</>
              ) : (
                <>운동 마스터! 이번 달만 {data.thisMonthCount}회! 👑</>
              )}
            </p>
          </div>
        </section>

        {/* 동기부여 메시지 */}
        <section className="mt-6 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <Dumbbell className="w-8 h-8 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">꾸준함의 힘</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                지금까지 총 <span className="text-yellow-400 font-bold">{formatNumber(data.totalVolume)}kg</span>을 
                들어올렸어요. 작은 노력이 모여 큰 결과가 됩니다!
              </p>
            </div>
          </div>
        </section>

        {/* 운동 시작 버튼 */}
        <div className="mt-6">
          <Link
            href="/workout"
            className="block w-full bg-blue-600 text-white text-center py-4 rounded-xl font-semibold text-lg shadow-lg hover:bg-blue-700 transition-colors"
          >
            오늘의 운동 시작하기
          </Link>
        </div>
      </div>
    </div>
  );
}
