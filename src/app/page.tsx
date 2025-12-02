import Link from "next/link";
import { Plus, Play } from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">JuniFit</h1>

      <div className="w-full flex gap-6">
        <Link
          href="/templates/new"
          className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center gap-4 text-center"
          aria-label="새 프로그램 만들기"
        >
          <Plus className="w-14 h-14 text-slate-700" />
          <span className="text-lg font-medium text-slate-800">새 프로그램 만들기</span>
        </Link>

        <Link
          href="/workout"
          className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center gap-4 text-center"
          aria-label="오늘의 운동 시작"
        >
          <Play className="w-14 h-14 text-slate-700" />
          <span className="text-lg font-medium text-slate-800">오늘의 운동 시작</span>
        </Link>
      </div>

      <section className="w-full mt-8">
        <h2 className="text-lg font-semibold mb-2">최근 운동 기록</h2>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center text-slate-500">
          아직 기록된 운동이 없습니다.
        </div>
      </section>
    </main>
  );
}
