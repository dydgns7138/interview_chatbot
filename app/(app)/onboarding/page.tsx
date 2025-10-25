"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createRecognition, getSpeechSupport } from "@/lib/voice";
import { saveProfile } from "@/lib/state/profile";
import { ko } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { Mic, Square } from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Step = {
  key: "name" | "gender" | "age" | "address" | "desiredJob" | "strengths" | "weaknesses";
  title: string;
  desc: string;
  input: "input" | "textarea" | "number";
};

const steps: Step[] = [
  { key: "name", title: ko.onboarding.name.title, desc: ko.onboarding.name.desc, input: "input" },
  { key: "gender", title: ko.onboarding.gender.title, desc: ko.onboarding.gender.desc, input: "input" },
  { key: "age", title: ko.onboarding.age.title, desc: ko.onboarding.age.desc, input: "number" },
  { key: "address", title: ko.onboarding.address.title, desc: ko.onboarding.address.desc, input: "input" },
  { key: "desiredJob", title: ko.onboarding.desiredJob.title, desc: ko.onboarding.desiredJob.desc, input: "input" },
  { key: "strengths", title: ko.onboarding.strengths.title, desc: ko.onboarding.strengths.desc, input: "textarea" },
  { key: "weaknesses", title: ko.onboarding.weaknesses.title, desc: ko.onboarding.weaknesses.desc, input: "textarea" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [value, setValue] = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const support = getSpeechSupport();

  React.useEffect(() => {
    setValue("");
    const el = inputRef.current as any;
    if (el) el.focus();
  }, [stepIndex]);

  const current = steps[stepIndex];
  const total = steps.length;

  function handleRecognizeToggle() {
    if (!support.sttSupported) {
      setNotice(ko.errors.sttUnavailable);
      return;
    }
    if (listening) {
      (window as any)._recognition?.stop();
      setListening(false);
      return;
    }
    const recognition = createRecognition("ko-KR");
    if (!recognition) {
      setNotice(ko.errors.sttUnavailable);
      return;
    }
    (window as any)._recognition = recognition;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // 최종 결과만 반영하여 중복 누적을 방지한다
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res.isFinal) continue;
        const transcript = res[0].transcript.trim();
        if (transcript) setValue((prev) => (prev ? prev + " " : "") + transcript);
      }
    };
    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") setNotice(ko.errors.sttDenied);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  }

  async function handleNext(skip = false) {
    if (isTransitioning) return; // 애니메이션 중에는 버튼 클릭 무시
    
    setIsTransitioning(true);
    
    const key = current.key;
    let payload: any = {};
    if (skip) payload[key] = null;
    else if (key === "age") {
      const parsed = Number(value);
      payload.age = Number.isFinite(parsed) ? parsed : undefined;
    } else {
      payload[key] = value || undefined;
    }
    await saveProfile(payload);
    
    if (stepIndex < total - 1) {
      // 애니메이션 완료 후 다음 단계로 이동
      setTimeout(() => {
        setStepIndex((i) => i + 1);
        setIsTransitioning(false);
      }, 300); // 애니메이션 시간과 맞춤
    } else {
      router.push("/jobs");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <Stepper current="onboarding" />
      </div>
      <section className="mb-8 rounded-2xl bg-gradient-to-b from-indigo-50 to-white p-6 shadow-sm ring-1 ring-slate-200 dark:from-slate-800 dark:to-slate-900 dark:ring-slate-800">
        <h1 className="mb-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">기본 정보</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">질문에 차근차근 답해주세요. 음성 입력도 사용할 수 있어요.</p>
      </section>
      <div className="card gap-6 rounded-2xl p-6 shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
              <div>{`단계 ${ko.onboarding.step(stepIndex + 1, total)}`}</div>
              <div className="font-medium text-slate-700 dark:text-slate-200">{current.title}</div>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{current.desc}</p>
            <div className="flex items-start gap-2">
              {current.input === "textarea" ? (
                <Textarea
                  aria-label={current.title}
                  ref={(el) => (inputRef.current = el)}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={current.title}
                />
              ) : (
                <Input
                  aria-label={current.title}
                  type={current.input === "number" ? "number" : "text"}
                  ref={(el) => (inputRef.current = el)}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={current.title}
                />
              )}
              <Button
                aria-pressed={listening}
                aria-label={listening ? "음성 입력 중지" : "음성 입력 시작"}
                variant="outline"
                onClick={handleRecognizeToggle}
              >
                {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            {notice && <p className="mt-2 text-sm text-red-600" role="status">{notice}</p>}
            <div className="mt-6 flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleNext(true)}
                disabled={isTransitioning}
              >
                {ko.skip}
              </Button>
              <Button 
                onClick={() => handleNext(false)}
                disabled={isTransitioning}
              >
                {ko.next}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {stepIndex === total - 1 && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-white/90 px-4 py-3 backdrop-blur dark:bg-slate-900/80">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">모든 항목을 완료하셨다면 다음 단계로 이동하세요.</span>
            <Link href="/jobs" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600/70">직무 선택으로 이동</Link>
          </div>
        </div>
      )}
    </div>
  );
}


