"use client";
// 루트 경로(`/`) - 빈 화면 방지: "이동 중..." 표시 후 온보딩으로 리다이렉트
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-slate-600">이동 중...</p>
    </div>
  );
}