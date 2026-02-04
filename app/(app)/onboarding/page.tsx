"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createRecognition, getSpeechSupport, speak, stopSpeaking } from "@/lib/voice";
import { saveProfile } from "@/lib/state/profile";
import { ko } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { Mic, Square, ChevronUp, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoice } from "@/lib/state/voice-context";
import { useFormData } from "@/lib/state/form-context";

// Web Speech API 타입 정의
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

type Step = {
  key: "name" | "gender" | "age" | "address" | "desiredJob" | "career" | "strengths" | "weaknesses";
  title: string;
  desc: string;
  label: string;
};

const steps: Step[] = [
  { key: "name", title: ko.onboarding.name.title, desc: ko.onboarding.name.desc, label: "이름" },
  { key: "gender", title: ko.onboarding.gender.title, desc: ko.onboarding.gender.desc, label: "성별" },
  { key: "age", title: ko.onboarding.age.title, desc: ko.onboarding.age.desc, label: "나이" },
  { key: "address", title: ko.onboarding.address.title, desc: ko.onboarding.address.desc, label: "거주지" },
  { key: "desiredJob", title: ko.onboarding.desiredJob.title, desc: ko.onboarding.desiredJob.desc, label: "희망 직종" },
  { key: "career", title: ko.onboarding.career.title, desc: ko.onboarding.career.desc, label: "실습 경력" },
  { key: "strengths", title: ko.onboarding.strengths.title, desc: ko.onboarding.strengths.desc, label: "강점" },
  { key: "weaknesses", title: ko.onboarding.weaknesses.title, desc: ko.onboarding.weaknesses.desc, label: "약점" },
];

// 시/도 목록
const SIDO_LIST = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원도",
  "충청북도",
  "충청남도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

// 희망 직종 목록
const DESIRED_JOB_LIST = [
  "사무지원",
  "고객 서비스",
  "포장·조립",
  "생활지원 서비스",
  "물류 운송 보조",
  "환경·청소",
  "기타",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [listening, setListening] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);
  const support = getSpeechSupport();

  // 모든 단계의 값을 유지하는 상태
  const [formData, setFormData] = React.useState<{
    name: string;
    gender: string;
    age: string;
    address: { sido: string; gugun: string; detailAddress: string };
    desiredJob: { selected: string; custom: string };
    career: { organization: string; startDate: string; endDate: string; duties: string };
    strengths: string;
    weaknesses: string;
  }>({
    name: "",
    gender: "",
    age: "",
    address: { sido: "", gugun: "", detailAddress: "" },
    desiredJob: { selected: "", custom: "" },
    career: { organization: "", startDate: "", endDate: "", duties: "" },
    strengths: "",
    weaknesses: "",
  });

  // 스킵 상태 추적
  const [skippedFields, setSkippedFields] = React.useState<Set<string>>(new Set());

  // 8단계 완료 여부 (다음 또는 입력하지 않음 버튼을 눌렀는지)
  const [isStep8Completed, setIsStep8Completed] = React.useState(false);

  // 확인 모달 상태
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<string | null>(null);

  const { screenReaderEnabled } = useVoice();

  const current = steps[stepIndex];
  const total = steps.length;

  // 현재 단계의 값 가져오기
  const getCurrentValue = () => {
    if (!current) return "";
    switch (current.key) {
      case "name":
        return formData.name;
      case "gender":
        return formData.gender;
      case "age":
        return formData.age;
      case "address":
        return formData.address;
      case "desiredJob":
        return formData.desiredJob;
      case "career":
        return formData.career;
      case "strengths":
        return formData.strengths;
      case "weaknesses":
        return formData.weaknesses;
      default:
        return "";
    }
  };

  // 현재 단계의 값 설정하기
  const setCurrentValue = (val: any) => {
    if (!current) return;
    setFormData((prev) => {
      switch (current.key) {
        case "name":
          return { ...prev, name: val };
        case "gender":
          return { ...prev, gender: val };
        case "age":
          return { ...prev, age: val };
        case "address":
          return { ...prev, address: val };
        case "desiredJob":
          return { ...prev, desiredJob: val };
        case "strengths":
          return { ...prev, strengths: val };
        case "weaknesses":
          return { ...prev, weaknesses: val };
        default:
          return prev;
      }
    });
  };

  // 현재 단계에 입력값이 있는지 확인
  const hasValue = (): boolean => {
    if (!current) return false;
    const value = getCurrentValue();
    switch (current.key) {
      case "name":
      case "gender":
      case "age":
      case "strengths":
      case "weaknesses":
        return typeof value === "string" && value.trim() !== "";
      case "address":
        const addr = value as { sido: string; gugun: string; detailAddress: string };
        return !!(addr.sido && addr.gugun.trim() && addr.detailAddress.trim());
      case "desiredJob":
        const job = value as { selected: string; custom: string };
        if (job.selected === "기타") {
          return !!job.custom.trim();
        }
        return !!job.selected;
      case "career":
        const career = value as { organization: string; startDate: string; endDate: string; duties: string };
        return !!(career.organization.trim() && career.startDate.trim() && career.endDate.trim() && career.duties.trim() && new Date(career.startDate) <= new Date(career.endDate));
      default:
        return false;
    }
  };

  // 단계 변경 시 포커스
  React.useEffect(() => {
    const el = inputRef.current as any;
    if (el) {
      setTimeout(() => el.focus(), 100);
    }
  }, [stepIndex]);

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
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res || !res.isFinal) continue;
        const transcript = res[0]?.transcript?.trim();
        if (transcript && current) {
          if (current.key === "address") {
            const addr = formData.address;
            if (!addr.gugun) {
              setFormData((prev) => ({
                ...prev,
                address: { ...prev.address, gugun: transcript },
              }));
            } else {
              setFormData((prev) => ({
                ...prev,
                address: { ...prev.address, detailAddress: (prev.address.detailAddress ? prev.address.detailAddress + " " : "") + transcript },
              }));
            }
          } else if (current.key === "desiredJob" && formData.desiredJob.selected === "기타") {
            setFormData((prev) => ({
              ...prev,
              desiredJob: { ...prev.desiredJob, custom: (prev.desiredJob.custom ? prev.desiredJob.custom + " " : "") + transcript },
            }));
          } else if (current.key === "career") {
            // 실습 경력 단계에서는 기관명에 음성 입력 적용 (기본 micButton)
            const currentVal = getCurrentValue();
            if (typeof currentVal === "object" && currentVal !== null && "organization" in currentVal) {
              setFormData((prev) => ({
                ...prev,
                career: { ...prev.career, organization: (prev.career.organization ? prev.career.organization + " " : "") + transcript },
              }));
            }
          } else {
            const currentVal = getCurrentValue();
            setCurrentValue(typeof currentVal === "string" ? (currentVal ? currentVal + " " : "") + transcript : transcript);
          }
        }
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

  function handlePrevious() {
    if (isTransitioning || stepIndex === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setStepIndex((i) => i - 1);
      setIsTransitioning(false);
    }, 300);
  }

  async function handleNext(skip = false) {
    if (isTransitioning || !current) return;

    if (!skip && !hasValue()) {
      setNotice("입력을 완료해주세요.");
      return;
    }

    setIsTransitioning(true);

    const key = current.key;
    let payload: any = {};

    if (skip) {
      payload[key] = null;
      setSkippedFields((prev) => new Set([...prev, key]));
    } else {
      setSkippedFields((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      
      if (key === "age") {
        const parsed = Number(formData.age);
        payload.age = Number.isFinite(parsed) ? parsed : undefined;
      } else if (key === "address") {
        const addr = formData.address;
        const addressParts = [addr.sido, addr.gugun, addr.detailAddress].filter(Boolean);
        payload.address = addressParts.length > 0 ? addressParts.join(" ") : undefined;
      } else if (key === "desiredJob") {
        const job = formData.desiredJob;
        payload.desiredJob = job.selected === "기타" && job.custom
          ? job.custom
          : job.selected || undefined;
      } else {
        const val = getCurrentValue();
        payload[key] = typeof val === "string" ? val.trim() || undefined : undefined;
      }
    }

    await saveProfile(payload);

    // 7단계에서 다음 또는 입력하지 않음 버튼을 눌렀는지 확인
    if (key === "weaknesses") {
      setIsStep8Completed(true);
      // 8단계에서는 자동으로 이동하지 않고, "이력서 작성으로 이동" 버튼만 활성화
      setIsTransitioning(false);
      setNotice(null);
      return;
    }

    if (stepIndex < total - 1) {
      setTimeout(() => {
        setStepIndex((i) => i + 1);
        setIsTransitioning(false);
        setNotice(null);
      }, 300);
    }
  }

  // 나이 증감
  function handleAgeChange(delta: number) {
    const currentAge = Number(formData.age) || 0;
    const newAge = Math.max(0, Math.min(150, currentAge + delta));
    setFormData((prev) => ({ ...prev, age: newAge.toString() }));
    if (newAge > 0) {
      setSkippedFields((prev) => {
        const next = new Set(prev);
        next.delete("age");
        return next;
      });
    }
  }

  // 단계로 이동
  function handleStepClick(index: number) {
    if (isTransitioning) return;
    if (index === stepIndex) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setStepIndex(index);
      setIsTransitioning(false);
    }, 300);
  }

  // 누락 항목 체크 함수 (단일 소스)
  const checkMissing = React.useCallback((): Array<{ step: number; label: string; key: string }> => {
    const missing: Array<{ step: number; label: string; key: string }> = [];

    steps.forEach((step, index) => {
      const key = step.key;
      let isEmpty = false;

      switch (key) {
        case "name":
          isEmpty = !formData.name.trim();
          break;
        case "gender":
          isEmpty = !formData.gender;
          break;
        case "age":
          isEmpty = !formData.age.trim();
          break;
        case "address":
          const addr = formData.address;
          isEmpty = !(addr.sido && addr.gugun.trim() && addr.detailAddress.trim());
          break;
        case "desiredJob":
          const job = formData.desiredJob;
          if (job.selected === "기타") {
            isEmpty = !job.custom.trim();
          } else {
            isEmpty = !job.selected;
          }
          break;
        case "career":
          const career = formData.career;
          isEmpty = !(career.organization.trim() && career.startDate.trim() && career.endDate.trim() && career.duties.trim() && new Date(career.startDate) <= new Date(career.endDate));
          break;
        case "strengths":
          isEmpty = !formData.strengths.trim();
          break;
        case "weaknesses":
          isEmpty = !formData.weaknesses.trim();
          break;
      }

      if (isEmpty) {
        missing.push({ step: index + 1, label: step.label, key });
      }
    });

    return missing;
  }, [formData]);

  const { setFormData: setFormDataContext } = useFormData();

  // 이력서 작성으로 이동 (모달 확인 포함)
  async function handleGoToResume() {
    const missing = checkMissing();
    
    if (missing.length > 0) {
      setPendingNavigation("/resume");
      setShowConfirmModal(true);
      return;
    }

    // 기본정보 데이터를 Context에 저장 (저장 없음, 메모리만)
    setFormDataContext({
      name: formData.name,
      gender: formData.gender,
      age: formData.age,
      address: formData.address,
      desiredJob: formData.desiredJob,
      career: formData.career,
      strengths: formData.strengths,
      weaknesses: formData.weaknesses,
    });

    router.push("/resume");
  }

  // 모달 확인 후 이동
  function handleConfirmAndGo() {
    setShowConfirmModal(false);
    const target = pendingNavigation || "/resume";
    setPendingNavigation(null);
    
    if (target === "/resume") {
      // 기본정보 데이터를 Context에 저장 (저장 없음, 메모리만)
      setFormDataContext({
        name: formData.name,
        gender: formData.gender,
        age: formData.age,
        address: formData.address,
        desiredJob: formData.desiredJob,
        career: formData.career,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
      });
    }
    
    router.push(target);
  }

  // 탭 클릭 핸들러 (상단 탭에서 호출)
  const handleTabClick = React.useCallback((href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    // 항상 preventDefault를 먼저 실행
    e.preventDefault();
    e.stopPropagation();

    if (href === "/onboarding") {
      // 기본정보 탭으로 이동은 항상 허용
      router.push(href);
      return;
    }

    // 다른 탭으로 이동 시 누락 항목 확인
    const missing = checkMissing();
    if (missing.length > 0) {
      setPendingNavigation(href);
      setShowConfirmModal(true);
    } else {
      router.push(href);
    }
  }, [checkMissing, router]);

  // window 객체를 통해 핸들러 등록
  React.useEffect(() => {
    (window as any).__onboardingTabClickHandler = handleTabClick;
    return () => {
      delete (window as any).__onboardingTabClickHandler;
    };
  }, [handleTabClick]);

  // 화면 읽기 기능 (기본정보 탭에서만)
  React.useEffect(() => {
    if (!screenReaderEnabled || !current) {
      stopSpeaking();
      return;
    }

    const textToRead = `${current.title}. ${current.desc}`;
    stopSpeaking(); // 이전 읽기 취소
    speak(textToRead, { lang: "ko-KR" });
  }, [stepIndex, current, screenReaderEnabled]);

  // 누락 항목 목록 생성 (모달 표시용)
  const getMissingFieldsList = () => {
    return checkMissing();
  };

  if (!current) {
    return <div>Loading...</div>;
  }

  // 단계별 입력 필드 렌더링
  const renderInput = () => {
    const micButton = (
      <Button
        aria-pressed={listening}
        aria-label={listening ? "음성 입력 중지" : "음성 입력 시작"}
        variant="outline"
        onClick={handleRecognizeToggle}
        className="flex-shrink-0"
      >
        {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
    );

    if (current.key === "gender") {
      return (
        <div className="flex items-center gap-2">
          {micButton}
          <select
            ref={(el) => { inputRef.current = el; }}
            value={formData.gender}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, gender: e.target.value }));
              if (e.target.value) {
                setSkippedFields((prev) => {
                  const next = new Set(prev);
                  next.delete("gender");
                  return next;
                });
              }
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">성별을 선택해 주세요</option>
            <option value="남자">남자</option>
            <option value="여자">여자</option>
          </select>
        </div>
      );
    }

    if (current.key === "age") {
      return (
        <div className="flex items-center gap-2">
          {micButton}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              ref={(el) => { inputRef.current = el; }}
              value={formData.age}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, age: e.target.value }));
                if (e.target.value) {
                  setSkippedFields((prev) => {
                    const next = new Set(prev);
                    next.delete("age");
                    return next;
                  });
                }
              }}
              placeholder="숫자만 입력"
              className="w-32"
            />
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-5 w-8 p-0"
                onClick={() => handleAgeChange(1)}
                disabled={isTransitioning}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-5 w-8 p-0"
                onClick={() => handleAgeChange(-1)}
                disabled={isTransitioning}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-300">세</span>
          </div>
        </div>
      );
    }

    if (current.key === "address") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {micButton}
            <select
              value={formData.address.sido}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, address: { ...prev.address, sido: e.target.value } }));
                if (e.target.value || formData.address.gugun || formData.address.detailAddress) {
                  setSkippedFields((prev) => {
                    const next = new Set(prev);
                    next.delete("address");
                    return next;
                  });
                }
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">시/도를 선택해 주세요</option>
              {SIDO_LIST.map((sido) => (
                <option key={sido} value={sido}>{sido}</option>
              ))}
            </select>
          </div>
          <div className="ml-10">
            <Input
              value={formData.address.gugun}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, address: { ...prev.address, gugun: e.target.value } }));
                if (formData.address.sido || e.target.value || formData.address.detailAddress) {
                  setSkippedFields((prev) => {
                    const next = new Set(prev);
                    next.delete("address");
                    return next;
                  });
                }
              }}
              placeholder="구/군"
              className="w-full"
            />
          </div>
          <div className="ml-10">
            <Input
              value={formData.address.detailAddress}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, address: { ...prev.address, detailAddress: e.target.value } }));
                if (formData.address.sido || formData.address.gugun || e.target.value) {
                  setSkippedFields((prev) => {
                    const next = new Set(prev);
                    next.delete("address");
                    return next;
                  });
                }
              }}
              placeholder="상세 주소"
              className="w-full"
            />
          </div>
        </div>
      );
    }

    if (current.key === "desiredJob") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {micButton}
            <select
              value={formData.desiredJob.selected}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, desiredJob: { ...prev.desiredJob, selected: e.target.value } }));
                if (e.target.value && e.target.value !== "기타") {
                  setSkippedFields((prev) => {
                    const next = new Set(prev);
                    next.delete("desiredJob");
                    return next;
                  });
                }
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">희망 직종을 선택해 주세요</option>
              {DESIRED_JOB_LIST.map((job) => (
                <option key={job} value={job}>{job}</option>
              ))}
            </select>
          </div>
          {formData.desiredJob.selected === "기타" && (
            <div className="ml-10">
              <Input
                value={formData.desiredJob.custom}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, desiredJob: { ...prev.desiredJob, custom: e.target.value } }));
                  if (e.target.value) {
                    setSkippedFields((prev) => {
                      const next = new Set(prev);
                      next.delete("desiredJob");
                      return next;
                    });
                  }
                }}
                placeholder="희망 직종을 입력해 주세요"
                className="w-full"
              />
            </div>
          )}
        </div>
      );
    }

    if (current.key === "career") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">실습지(기관명)</label>
            <div className="flex items-center gap-2">
              {micButton}
              <Input
                value={formData.career.organization}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    career: { ...prev.career, organization: e.target.value },
                  }));
                  if (e.target.value.trim() || formData.career.startDate.trim() || formData.career.endDate.trim() || formData.career.duties.trim()) {
                    setSkippedFields((prev) => {
                      const next = new Set(prev);
                      next.delete("career");
                      return next;
                    });
                  }
                }}
                placeholder="예시: 늘봄 근로사업장"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">실습 기간</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1 dark:text-slate-400">시작일</label>
                <Input
                  type="date"
                  value={formData.career.startDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      career: { ...prev.career, startDate: val },
                    }));
                    // 종료일이 시작일보다 이전이면 종료일도 업데이트
                    if (val && formData.career.endDate && new Date(val) > new Date(formData.career.endDate)) {
                      setFormData((prev) => ({
                        ...prev,
                        career: { ...prev.career, endDate: val },
                      }));
                    }
                    if (val.trim() || formData.career.organization.trim() || formData.career.endDate.trim() || formData.career.duties.trim()) {
                      setSkippedFields((prev) => {
                        const next = new Set(prev);
                        next.delete("career");
                        return next;
                      });
                    }
                  }}
                  max={formData.career.endDate || undefined}
                  className="w-full"
                />
              </div>
              <div className="flex items-center pt-6">
                <span className="text-slate-400">~</span>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1 dark:text-slate-400">종료일</label>
                <Input
                  type="date"
                  value={formData.career.endDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      career: { ...prev.career, endDate: val },
                    }));
                    if (val.trim() || formData.career.organization.trim() || formData.career.startDate.trim() || formData.career.duties.trim()) {
                      setSkippedFields((prev) => {
                        const next = new Set(prev);
                        next.delete("career");
                        return next;
                      });
                    }
                  }}
                  min={formData.career.startDate || undefined}
                  className="w-full"
                />
              </div>
            </div>
            {formData.career.startDate && formData.career.endDate && new Date(formData.career.startDate) > new Date(formData.career.endDate) && (
              <p className="mt-1 text-xs text-red-500">종료일은 시작일보다 이후여야 합니다.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">맡은 주요 직무</label>
            <div className="flex items-start gap-2">
              {micButton}
              <Textarea
                value={formData.career.duties}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    career: { ...prev.career, duties: e.target.value },
                  }));
                  if (e.target.value.trim() || formData.career.organization.trim() || formData.career.startDate.trim() || formData.career.endDate.trim()) {
                    setSkippedFields((prev) => {
                      const next = new Set(prev);
                      next.delete("career");
                      return next;
                    });
                  }
                }}
                placeholder="포장하기, 테이블 정리하기"
                className="flex-1 min-h-[100px] resize-none"
              />
            </div>
          </div>
        </div>
      );
    }

    if (current.key === "strengths") {
      return (
        <div className="flex items-start gap-2">
          {micButton}
          <Textarea
            aria-label={current.title}
            ref={(el) => { inputRef.current = el; }}
            value={formData.strengths}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, strengths: e.target.value }));
              if (e.target.value.trim()) {
                setSkippedFields((prev) => {
                  const next = new Set(prev);
                  next.delete("strengths");
                  return next;
                });
              }
            }}
            placeholder="예) 꼼꼼하게 일을 처리하고 책임감이 강한 편입니다."
            className="flex-1"
          />
        </div>
      );
    }

    if (current.key === "weaknesses") {
      return (
        <div className="flex items-start gap-2">
          {micButton}
          <Textarea
            aria-label={current.title}
            ref={(el) => { inputRef.current = el; }}
            value={formData.weaknesses}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, weaknesses: e.target.value }));
              if (e.target.value.trim()) {
                setSkippedFields((prev) => {
                  const next = new Set(prev);
                  next.delete("weaknesses");
                  return next;
                });
              }
            }}
            placeholder="예) 새로운 환경에 적응하는 데 시간이 조금 필요합니다."
            className="flex-1"
          />
        </div>
      );
    }

    // 1단계: 이름
    return (
      <div className="flex items-center gap-2">
        {micButton}
        <Input
          aria-label={current.title}
          type="text"
          ref={(el) => { inputRef.current = el; }}
          value={formData.name}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, name: e.target.value }));
            if (e.target.value.trim()) {
              setSkippedFields((prev) => {
                const next = new Set(prev);
                next.delete("name");
                return next;
              });
            }
          }}
          placeholder={current.title}
          className="flex-1"
        />
      </div>
    );
  };

  const missingFieldsList = getMissingFieldsList();
  const canProceed = hasValue();

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-10">
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
              {renderInput()}
              {notice && <p className="mt-2 text-sm text-red-600" role="status">{notice}</p>}
              <div className="mt-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {stepIndex > 0 && (
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={isTransitioning}
                      className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"
                    >
                      이전
                    </Button>
                  )}
                  <Button
                    onClick={() => handleNext(false)}
                    disabled={isTransitioning || !canProceed}
                    className={canProceed && !isTransitioning 
                      ? "bg-blue-500 hover:bg-blue-600 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }
                  >
                    {ko.next}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleNext(true)}
                    disabled={isTransitioning}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {ko.skip}
                  </Button>
                  {stepIndex === total - 1 && isStep8Completed && (
                    <Button
                      onClick={handleGoToResume}
                      className="bg-red-200 hover:bg-red-300 text-red-900 dark:bg-red-900/30 dark:hover:bg-red-900/40 dark:text-red-200"
                      disabled={isTransitioning}
                    >
                      이력서 작성으로 이동
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 단계 진행 바 */}
        <div className="mt-6 border-t bg-white/90 px-4 py-3 backdrop-blur dark:bg-slate-900/80">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {stepIndex === total - 1
                  ? "모든 항목을 완료하셨다면 다음 단계로 이동하세요."
                  : `${stepIndex + 1}단계 / ${total}단계`}
              </span>
            </div>
            {/* 진행 바 */}
            <div className="flex items-center gap-2">
              {steps.map((step, index) => {
                const isActive = index === stepIndex;
                const isCompleted = index < stepIndex;
                return (
                  <button
                    key={step.key}
                    onClick={() => handleStepClick(index)}
                    disabled={isTransitioning}
                    className={`
                      flex-1 h-2 rounded-full transition-all duration-200
                      ${isActive
                        ? "bg-indigo-600 ring-2 ring-indigo-600 ring-offset-2"
                        : isCompleted
                        ? "bg-indigo-300 dark:bg-indigo-700"
                        : "bg-slate-200 dark:bg-slate-700"
                      }
                      hover:opacity-80
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    aria-label={`${index + 1}단계: ${step.title}`}
                    title={`${index + 1}단계: ${step.title}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 dark:bg-slate-800">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
              입력하지 않은 단계가 있습니다
            </h2>
            <div className="mb-4 space-y-2">
              {missingFieldsList.map((item) => (
                <p key={item.key} className="text-sm text-slate-700 dark:text-slate-300">
                  {item.step}단계 {item.label}을 입력하지 않았습니다.
                </p>
              ))}
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-4">
                그대로 진행하시겠습니까?
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingNavigation(null);
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleConfirmAndGo}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
