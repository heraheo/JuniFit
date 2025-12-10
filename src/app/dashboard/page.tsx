"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, TrendingUp, Dumbbell, Award } from "lucide-react";
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
      const dashboardData = await getDashboardData();
      setData(dashboardData);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-slate-600">로딩 중...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">데이터를 불러올 수 없습니다.</p>
          <Link href="/" className="text-blue-600 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 이번 달 캘린더 생성
  const year = data.currentYear;
  const month = data.currentMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 (일요일) ~ 6 (토요일)

  const calendarDays = [];
  // 빈 칸 추가 (월의 첫날이 시작하는 요일 전까지)
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  // 실제 날짜 추가
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">운동 대시보드</h1>
        </header>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* 총 운동 횟수 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-medium text-slate-600">총 운동 횟수</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800">{data.totalSessions}회</p>
          </div>

          {/* 이번 달 운동 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-sm font-medium text-slate-600">이번 달 운동</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800">{data.thisMonthCount}일</p>
          </div>

          {/* 총 볼륨 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-sm font-medium text-slate-600">총 볼륨</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800">
              {(data.totalVolume / 1000).toFixed(1)}
              <span className="text-lg text-slate-500 ml-1">톤</span>
            </p>
          </div>
        </div>

        {/* 이번 달 운동 캘린더 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {year}년 {month + 1}월 운동 기록
          </h2>

          <div className="grid grid-cols-7 gap-2">
            {/* 요일 헤더 */}
            {weekDays.map((day, index) => (
              <div
                key={`weekday-${index}`}
                className={`text-center text-sm font-medium py-2 ${
                  index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-slate-600"
                }`}
              >
                {day}
              </div>
            ))}

            {/* 날짜 */}
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const hasWorkout = data.monthlyWorkoutDates.includes(day);
              const isToday = 
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              return (
                <div
                  key={`day-${day}`}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    hasWorkout
                      ? "bg-green-500 text-white shadow-md"
                      : isToday
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                      : "bg-gray-50 text-slate-600 hover:bg-gray-100"
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>운동 완료</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
              <span>오늘</span>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/history"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100 flex items-center justify-center gap-3"
          >
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-slate-800">운동 기록 상세보기</span>
          </Link>

          <Link
            href="/workout"
            className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow flex items-center justify-center gap-3 text-white"
          >
            <Dumbbell className="w-5 h-5" />
            <span className="font-medium">오늘의 운동 시작</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
