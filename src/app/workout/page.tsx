"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { getPrograms } from "@/lib/api";
import type { ProgramWithExercises } from "@/lib/api";

export default function WorkoutPage() {
  const [programs, setPrograms] = useState<ProgramWithExercises[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrograms() {
      const data = await getPrograms();
      setPrograms(data);
      setLoading(false);
    }
    fetchPrograms();
  }, []);

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">운동 프로그램 선택</h1>
        </header>

        {/* 프로그램 목록 */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">로딩 중...</p>
          </div>
        ) : programs.length === 0 ? (
          /* Empty State - 개선된 UI */
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="mb-4">
              <Dumbbell className="w-16 h-16 mx-auto text-slate-300" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">시작할 프로그램이 없습니다</h2>
            <p className="text-slate-600 mb-6">
              프로그램을 먼저 만들어보세요.<br />
              운동 계획을 세우고 실천할 수 있습니다.
            </p>
            <Link
              href="/templates/new"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              새 프로그램 만들기
            </Link>
          </div>
        ) : (
          <section className="flex flex-col gap-6">
            {programs.map((program) => (
              <Link key={program.id} href={`/workout/${program.id}`}>
                <div className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100">
                  <h3 className="text-xl font-semibold text-slate-800 mb-4">
                    {program.title}
                  </h3>
                  <p className="text-slate-600 text-base mb-6 leading-relaxed">
                    {program.description}
                  </p>
                  <div className="flex items-center">
                    <span className="text-blue-600 text-base font-medium">
                      운동 {program.exerciseCount}개
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}