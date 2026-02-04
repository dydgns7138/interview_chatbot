"use client";
import React from "react";
import Image from "next/image";
import { JOBS } from "@/lib/jobs";
import { Button } from "@/components/ui/button";
import { saveSelectedJob } from "@/lib/state/profile";
import { useRouter } from "next/navigation";
import { useVoice } from "@/lib/state/voice-context";
import { speak, stopSpeaking } from "@/lib/voice";

// 직무 선택을 위한 이미지 매핑 (public/images 실제 파일 확장자 기준)
const jobOptions = [
  { 
    id: "office-support", 
    name: "사무지원", 
    image: "/images/office.jpg",
    description: ["서류 작성 및 정리", "사무실 정리"]
  },
  { 
    id: "assembly-packaging", 
    name: "포장·조립", 
    image: "/images/manufacture.jpg",
    description: ["상자 포장", "물건 조립"]
  },
  { 
    id: "customer-service", 
    name: "고객 서비스", 
    image: "/images/service.jpg",
    description: ["바리스타", "제과제빵", "손님 응대"]
  },
  { 
    id: "environment-cleaning", 
    name: "환경·청소", 
    image: "/images/cleaning.png",
    description: ["학교·건물 청소", "환경미화"]
  },
  { 
    id: "care-support", 
    name: "생활 지원 서비스", 
    image: "/images/support.jpg",
    description: ["어르신 및 환우 말벗", "식사·이동 지원"]
  },
  { 
    id: "logistics", 
    name: "물류 운송 보조", 
    image: "/images/transportation.jpg",
    description: ["물품 분류", "물건 운반"]
  },
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

  // 직무 선택 시 읽기 (화면 설명 ON일 때만)
  React.useEffect(() => {
    if (screenReaderEnabled && selected) {
      const selectedJob = jobOptions.find((j) => j.id === selected);
      if (selectedJob) {
        stopSpeaking();
        const descriptionText = selectedJob.description.join(", ");
        speak(`${selectedJob.name}. ${descriptionText}`, { lang: "ko-KR" });
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {jobOptions.map((job) => {
          const descriptionText = job.description.join(", ");
          const cardText = `${job.name}. ${descriptionText}`;
          
          return (
          <div
            key={job.id}
            className={`relative flex flex-col cursor-pointer transition-all duration-200 p-3 md:p-4 rounded-lg border-2 bg-white shadow-sm hover:shadow-md ${
              selected === job.id 
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400" 
                : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-800"
            }`}
            onClick={() => {
              setSelected(job.id);
              // 화면 설명 ON일 때만 클릭 시 읽기
              if (screenReaderEnabled) {
                stopSpeaking();
                speak(cardText, { lang: "ko-KR" });
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={selected === job.id}
            aria-label={cardText}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelected(job.id);
                // 화면 설명 ON일 때만 키보드 선택 시 읽기
                if (screenReaderEnabled) {
                  stopSpeaking();
                  const descriptionText = job.description.join(", ");
                  const cardText = `${job.name}. ${descriptionText}`;
                  speak(cardText, { lang: "ko-KR" });
                }
              }
            }}
          >
            {/* 선택 표시 (체크 아이콘) */}
            {selected === job.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            
            {/* 이미지 */}
            <div className="mb-3 flex justify-center">
              <Image
                src={job.image}
                alt={job.name}
                width={200}
                height={200}
                className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg shadow-sm"
              />
            </div>
            
            {/* 직무명 */}
            <h3 className="text-lg md:text-xl font-bold text-center mb-2 text-slate-900 dark:text-slate-100">
              {job.name}
            </h3>
            
            {/* 직무 설명 */}
            <div className="space-y-1">
              {job.description.map((desc, idx) => (
                <div 
                  key={idx}
                  className="flex items-center text-sm md:text-base text-slate-600 dark:text-slate-300"
                >
                  <span className="w-1 h-1 rounded-full bg-slate-400 mr-1.5 flex-shrink-0"></span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
            
            {/* 면접 시작 버튼 (선택된 카드에만 표시, 오른쪽 아래) */}
            {selected === job.id && (
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleStart();
                }}
                className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 h-auto font-medium"
                aria-label="면접 시작"
              >
                면접 시작
              </Button>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}


