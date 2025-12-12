import Link from "next/link";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { getWorkoutLogs } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { HistoryClient } from "./HistoryClient";

export default async function LogsPage() {
  // 초기에는 10개만 로드 (Pagination)
  const logs = await getWorkoutLogs(10, 0);

  return (
    <div className="min-h-screen px-4 pt-6 pb-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center mb-6">
          <Link href="/" className="text-slate-600 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">운동 기록</h1>
        </header>

        {/* Content */}
        {!logs || logs.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="운동 기록이 없습니다"
            description="운동을 완료하면 여기에 기록이 표시됩니다."
            actionLabel="운동 시작하기"
            actionHref="/workout"
          />
        ) : (
          <HistoryClient initialLogs={logs} />
        )}
      </div>
    </div>
  );
}
