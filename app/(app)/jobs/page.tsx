"use client";
import React from "react";
import Image from "next/image";
import { JOBS } from "@/lib/jobs";
import { Button } from "@/components/ui/button";
import { saveSelectedJob } from "@/lib/state/profile";
import { useRouter } from "next/navigation";
import { useVoice } from "@/lib/state/voice-context";
import { speak, stopSpeaking } from "@/lib/voice";

// 직무 선택을 위한 이미지 매핑
const jobOptions = [
  { id: "office-support", name: "사무지원", image: "/images/office.png" },
  { id: "assembly-packaging", name: "포장·조립", image: "/images/manufacture.png" },
  { id: "customer-service", name: "고객 서비스", image: "/images/service.png" },
  { id: "environment-cleaning", name: "환경 및 청소", image: "/images/cleaning.png" },
  { id: "care-support", name: "생활 지원 서비스", image: "/images/support.png" },
  { id: "logistics", name: "물류 운송 보조", image: "/images/transportation.png" },
];

export default function JobsPage() {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string | null>(null);
  const { screenReaderEnabled } = useVoice();

  // 안내 문구
  const guideText = "직종을 선택한 후 '면접 시작' 버튼을 누르시면 면접 시뮬레이션 창으로 이동합니다.";

  // 탭 진입 시 안내 문구 읽기
  React.useEffect(() => {
    if (screenReaderEnabled) {
      stopSpeaking();
      speak(guideText, { lang: "ko-KR" });
    }
    return () => {
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenReaderEnabled]);

  // 직무 선택 시 읽기
  React.useEffect(() => {
    if (screenReaderEnabled && selected) {
      const selectedJob = jobOptions.find((j) => j.id === selected);
      if (selectedJob) {
        stopSpeaking();
        speak(`선택한 직무: ${selectedJob.name}`, { lang: "ko-KR" });
      }
    }
  }, [selected, screenReaderEnabled]);

  async function handleStart() {
    if (!selected) return;
    
    if (screenReaderEnabled) {
      stopSpeaking();
      speak("면접을 시작합니다", { lang: "ko-KR" });
    }
    
    await saveSelectedJob(selected);
    router.push("/chat");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-8 rounded-2xl bg-gradient-to-b from-indigo-50 to-white p-6 shadow-sm ring-1 ring-slate-200 dark:from-slate-800 dark:to-slate-900 dark:ring-slate-800">
        <h1 className="mb-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">직무 선택</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">{guideText}</p>
      </section>
      
      {/* 카드형 UI 그리드 */}
      <div className="grid grid-cols-2 gap-6 justify-items-center">
        {jobOptions.map((job) => (
          <div
            key={job.id}
            className={`flex flex-col items-center cursor-pointer hover:scale-105 transition-transform p-4 rounded-2xl ${
              selected === job.id 
                ? "ring-2 ring-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" 
                : "hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            onClick={() => setSelected(job.id)}
            role="button"
            tabIndex={0}
            aria-pressed={selected === job.id}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelected(job.id);
              }
            }}
          >
            <Image
              src={job.image}
              alt={job.name}
              width={300}
              height={300}
              className="w-28 h-28 md:w-32 md:h-32 object-cover rounded-2xl shadow-md transition-transform hover:scale-105"
            />
            <span className="mt-3 text-lg font-semibold text-center text-slate-800 dark:text-slate-100">
              {job.name}
            </span>
          </div>
        ))}
      </div>
      
      <div className="fixed inset-x-0 bottom-0 border-t bg-white/90 px-4 py-3 backdrop-blur dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {selected ? `선택됨: ${jobOptions.find((j) => j.id === selected)?.name}` : "직무를 선택해주세요"}
          </div>
          <Button onClick={handleStart} disabled={!selected} aria-label="면접 시작">
            면접 시작
          </Button>
        </div>
      </div>
    </div>
  );
}


