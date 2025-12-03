"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Program } from "@/types/database";

export default function ProgramsManagePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function fetchPrograms() {
    setLoading(true);
    // 소프트 삭제: is_archived가 false인 항목만 조회
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching programs:', error);
      alert('프로그램 목록을 불러오는데 실패했습니다.');
    } else {
      setPrograms(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(program: Program) {
    const confirmed = window.confirm(
      `"${program.title}" 프로그램을 삭제하시겠습니까?`
    );

    if (!confirmed) return;

    setDeleting(program.id);

    try {
      // 소프트 삭제: 실제 데이터를 삭제하지 않고 is_archived 플래그만 true로 변경
      // 이렇게 하면 workout_sessions에 연결된 운동 기록이 보존됨
      const { error } = await supabase
        .from('programs')
        .update({ is_archived: true })
        .eq('id', program.id);

      if (error) throw error;

      // 성공 시 알림 없이 조용히 목록 새로고침
      await fetchPrograms();
    } catch (error) {
      console.error('Error archiving program:', error);
      alert('프로그램 삭제에 실패했습니다.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">프로그램 관리</h1>
        </header>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">로딩 중...</p>
          </div>
        ) : programs.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-slate-600 mb-4">등록된 프로그램이 없습니다.</p>
            <Link
              href="/templates/new"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              새 프로그램 만들기
            </Link>
          </div>
        ) : (
          /* Programs List */
          <section className="space-y-4">
            {programs.map((program) => (
              <div
                key={program.id}
                className="bg-white rounded-xl shadow-md p-5 border border-gray-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      {program.title}
                    </h3>
                    {program.description && (
                      <p className="text-sm text-slate-600">
                        {program.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      생성일: {new Date(program.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Link
                    href={`/programs/edit/${program.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="font-medium">수정</span>
                  </Link>

                  <button
                    onClick={() => handleDelete(program)}
                    disabled={deleting === program.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="font-medium">
                      {deleting === program.id ? '삭제 중...' : '삭제'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Create New Button */}
        {!loading && programs.length > 0 && (
          <div className="mt-6">
            <Link
              href="/templates/new"
              className="block w-full bg-blue-600 text-white text-center py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              + 새 프로그램 만들기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
