"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useFormData } from "@/lib/state/form-context";
import { useVoice } from "@/lib/state/voice-context";
import { speak, stopSpeaking } from "@/lib/voice";
import { AlertTriangle, Printer, Camera, FileDown, Mic, Square } from "lucide-react";

type ResumeData = {
  introduction: string;
  strengths: string;
  weaknesses: string;
  career: Array<{
    organization: string;
    period: string;
    duties: string;
  }>;
};

type ResumeFormData = {
  name: string;
  gender: string;
  age: string;
  address: string;
  desiredJob: string;
  phone: string;
  email: string;
  introduction: string;
  strengths: string;
  weaknesses: string;
  career: Array<{
    organization: string;
    period: string;
    duties: string;
  }>;
  photo: string | null;
};

export default function ResumePage() {
  const router = useRouter();
  const { formData, setFormData } = useFormData();
  const { screenReaderEnabled } = useVoice();
  const [loading, setLoading] = React.useState(false);
  const [resumeData, setResumeData] = React.useState<ResumeData | null>(null);
  const [resumeForm, setResumeForm] = React.useState<ResumeFormData | null>(null);
  const hasReadGuideRef = React.useRef<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [listening, setListening] = React.useState(false);
  const [listeningField, setListeningField] = React.useState<string | null>(null);
  
  // 카메라 관련 state와 ref
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"preview" | "result">("preview");
  const [capturedDataUrl, setCapturedDataUrl] = React.useState<string | null>(null);
  const [videoReady, setVideoReady] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [cameraSupported, setCameraSupported] = React.useState(true);

  // 기본정보가 없으면 기본정보 페이지로 리다이렉트
  React.useEffect(() => {
    if (!formData) {
      router.push("/onboarding");
    }
  }, [formData, router]);

  // 이력서 초안 생성
  React.useEffect(() => {
    if (!formData) return;

    const currentFormData = formData; // 로컬 변수로 캡처

    async function generateResume() {
      setLoading(true);
      try {
        const res = await fetch("/api/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentFormData),
        });

        if (!res.ok) {
          throw new Error("이력서 생성 실패");
        }

        const data = await res.json();
        setResumeData(data);

        const address = `${currentFormData.address.sido} ${currentFormData.address.gugun} ${currentFormData.address.detailAddress}`.trim();
        const desiredJob = currentFormData.desiredJob.selected === "기타" ? currentFormData.desiredJob.custom : currentFormData.desiredJob.selected;

                // 실습 경력 데이터 처리: formData에서 가져오거나 GPT 생성 결과 사용
                let careerData: Array<{ organization: string; period: string; duties: string }> = [];
                if (currentFormData.career && (currentFormData.career.organization.trim() || currentFormData.career.duties.trim())) {
                  // 기본정보에서 입력한 실습 경력이 있으면 그것을 우선 사용
                  // 날짜를 기간 문자열로 변환
                  let periodStr = "";
                  if (currentFormData.career.startDate && currentFormData.career.endDate) {
                    const start = new Date(currentFormData.career.startDate);
                    const end = new Date(currentFormData.career.endDate);
                    const startStr = `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')}`;
                    const endStr = `${end.getFullYear()}.${String(end.getMonth() + 1).padStart(2, '0')}.${String(end.getDate()).padStart(2, '0')}`;
                    periodStr = `${startStr} ~ ${endStr}`;
                  }
                  careerData = [{
                    organization: currentFormData.career.organization,
                    period: periodStr,
                    duties: currentFormData.career.duties,
                  }];
                } else if (data.career && data.career.length > 0) {
                  // GPT가 생성한 경력 사용
                  careerData = data.career;
                }

                setResumeForm({
                  name: currentFormData.name,
                  gender: currentFormData.gender,
                  age: currentFormData.age,
                  address,
                  desiredJob,
                  phone: "",
                  email: "",
                  introduction: data.introduction || "",
                  strengths: data.strengths || currentFormData.strengths,
                  weaknesses: data.weaknesses || currentFormData.weaknesses,
                  career: careerData,
                  photo: null,
                });
      } catch (error) {
        console.error("Resume generation error:", error);
        // 기본값으로 설정
        const address = `${currentFormData.address.sido} ${currentFormData.address.gugun} ${currentFormData.address.detailAddress}`.trim();
        const desiredJob = currentFormData.desiredJob.selected === "기타" ? currentFormData.desiredJob.custom : currentFormData.desiredJob.selected;

                // 실습 경력 데이터 처리
                let careerData: Array<{ organization: string; period: string; duties: string }> = [];
                if (currentFormData.career && (currentFormData.career.organization.trim() || currentFormData.career.duties.trim())) {
                  // 날짜를 기간 문자열로 변환
                  let periodStr = "";
                  if (currentFormData.career.startDate && currentFormData.career.endDate) {
                    const start = new Date(currentFormData.career.startDate);
                    const end = new Date(currentFormData.career.endDate);
                    const startStr = `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')}`;
                    const endStr = `${end.getFullYear()}.${String(end.getMonth() + 1).padStart(2, '0')}.${String(end.getDate()).padStart(2, '0')}`;
                    periodStr = `${startStr} ~ ${endStr}`;
                  }
                  careerData = [{
                    organization: currentFormData.career.organization,
                    period: periodStr,
                    duties: currentFormData.career.duties,
                  }];
                }

                setResumeForm({
                  name: currentFormData.name,
                  gender: currentFormData.gender,
                  age: currentFormData.age,
                  address,
                  desiredJob,
                  phone: "",
                  email: "",
                  introduction: `${currentFormData.name}입니다. ${desiredJob} 분야에서 일하고 싶습니다.`,
                  strengths: currentFormData.strengths,
                  weaknesses: currentFormData.weaknesses,
                  career: careerData,
                  photo: null,
                });
      } finally {
        setLoading(false);
      }
    }

    generateResume();
  }, [formData, router]);

  // 화면설명 안내 문구 읽기
  React.useEffect(() => {
    if (screenReaderEnabled && !hasReadGuideRef.current && resumeForm) {
      const guideText = "주의: 이력서는 저장되지 않습니다. 새로고침하거나 페이지를 나가면 입력한 내용이 사라질 수 있어요. 기본 정보를 바탕으로 이력서 초안을 생성합니다. 필요한 항목은 직접 수정하거나 추가 입력할 수 있습니다.";
      stopSpeaking();
      speak(guideText, { lang: "ko-KR" });
      hasReadGuideRef.current = true;
    }
    return () => {
      if (!screenReaderEnabled) {
        hasReadGuideRef.current = false;
      }
    };
  }, [screenReaderEnabled, resumeForm]);

  // 컴포넌트 언마운트 시 정리
  React.useEffect(() => {
    return () => {
      hasReadGuideRef.current = false;
      stopSpeaking();
      // 카메라 스트림 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // 카메라 지원 여부 확인
  React.useEffect(() => {
    if (typeof navigator !== "undefined" && 
        navigator.mediaDevices && 
        typeof navigator.mediaDevices.getUserMedia === "function") {
      setCameraSupported(true);
    } else {
      setCameraSupported(false);
    }
  }, []);

  // 사진 업로드
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setResumeForm((prev) => prev ? { ...prev, photo: result } : null);
    };
    reader.readAsDataURL(file);
  }

  // 모달 열기 (사진 찍기 버튼 클릭)
  function handleOpenCameraModal() {
    setIsModalOpen(true);
    setModalMode("preview");
    setCapturedDataUrl(null);
    setCameraError(null);
    setVideoReady(false);
  }

  // 모달이 열리면 카메라 자동 시작
  React.useEffect(() => {
    if (isModalOpen && modalMode === "preview") {
      startCameraInModal();
    }
  }, [isModalOpen, modalMode]);

  // 모달 내부에서 카메라 시작
  async function startCameraInModal() {
    // 클라이언트 사이드에서만 실행
    if (typeof window === "undefined") {
      setCameraError("카메라는 브라우저에서만 사용할 수 있습니다.");
      return;
    }

    // HTTPS/secure context 체크
    if (!window.isSecureContext) {
      setCameraError("카메라 촬영은 HTTPS 환경에서만 가능합니다. 업로드를 사용해주세요.");
      return;
    }

    // getUserMedia 지원 체크
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      setCameraError("이 기기/브라우저에서는 카메라 촬영을 지원하지 않습니다.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      setVideoReady(false); // 초기화
      setCameraError(null);

      // videoRef가 준비될 때까지 약간 대기 (모달이 열리고 DOM에 렌더링될 시간)
      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // video가 준비될 때까지 대기하고 videoReady 설정
        const checkVideoReady = () => {
          if (videoRef.current) {
            const video = videoRef.current;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              setVideoReady(true);
              console.log("[Camera] Video ready:", video.videoWidth, "x", video.videoHeight);
            } else {
              // 아직 준비되지 않았으면 잠시 후 다시 체크
              setTimeout(checkVideoReady, 100);
            }
          }
        };
        
        // 이벤트 리스너로도 체크
        const handleLoadedMetadata = () => {
          if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
            setVideoReady(true);
            console.log("[Camera] Video ready (loadedmetadata):", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
          }
        };
        
        const handleCanPlay = () => {
          if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
            setVideoReady(true);
            console.log("[Camera] Video ready (canplay):", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
          }
        };
        
        videoRef.current.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
        videoRef.current.addEventListener("canplay", handleCanPlay, { once: true });
        
        // 즉시 체크 및 주기적 체크
        checkVideoReady();
      } else {
        console.warn("[Camera] videoRef.current is null after waiting");
      }
    } catch (error: any) {
      console.error("Camera access error:", error);
      let errorMessage = "카메라에 접근할 수 없습니다.";
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "카메라 권한을 허용해 주세요.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "이 기기에서는 카메라를 사용할 수 없습니다.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "카메라가 다른 앱에서 사용 중이거나 접근할 수 없습니다.";
      } else if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
        errorMessage = "카메라 설정을 만족할 수 없습니다.";
      }
      
      setCameraError(errorMessage);
    }
  }

  // 업로드로 전환 (에러 발생 시)
  function handleSwitchToUpload() {
    handleCloseModal();
    // 모달이 닫힌 후 파일 업로드 트리거
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 100);
  }

  // video 준비 상태 확인
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !isModalOpen || modalMode !== "preview") {
      setVideoReady(false);
      return;
    }

    function handleLoadedMetadata() {
      const video = videoRef.current;
      if (!video) return;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoReady(true);
        console.log("[Camera] Video ready:", video.videoWidth, "x", video.videoHeight);
      }
    }

    function handleCanPlay() {
      const video = videoRef.current;
      if (!video) return;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoReady(true);
        console.log("[Camera] Video can play:", video.videoWidth, "x", video.videoHeight);
      }
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);

    // 이미 로드된 경우 즉시 체크
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoReady(true);
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [isModalOpen, modalMode]);

  // 모달 닫기 및 카메라 정리
  function handleCloseModal() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsModalOpen(false);
    setModalMode("preview");
    setCapturedDataUrl(null);
    setVideoReady(false);
    setCameraError(null);
  }

  // 모달 내부에서 사진 찍기 (상태 A → B)
  function handleCapturePhoto() {
    const video = videoRef.current;
    if (!video) {
      console.log("[Capture] Video ref invalid");
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    console.log("[Capture] Video dimensions:", videoWidth, "x", videoHeight);

    // videoWidth/videoHeight가 0이면 캡처 실패
    if (videoWidth === 0 || videoHeight === 0) {
      alert("카메라 준비 중입니다. 잠시 후 다시 눌러주세요.");
      console.log("[Capture] Video not ready - dimensions are 0");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("[Capture] Failed to get canvas context");
      return;
    }

    // 좌우 반전 적용 (미리보기와 동일하게)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // DataURL 방식으로 직접 변환 (가장 확실한 방법)
    const dataUrl = canvas.toDataURL("image/png", 0.92);
    console.log("[Capture] DataURL length:", dataUrl.length);
    console.log("[Capture] DataURL preview (first 100 chars):", dataUrl.substring(0, 100));

    // 캡처 후 스트림 정지 (선택사항 - 미리보기 유지하려면 주석 처리)
    // if (streamRef.current) {
    //   streamRef.current.getTracks().forEach((track) => track.stop());
    // }

    // 모달 state에 저장하고 상태 B로 전환
    setCapturedDataUrl(dataUrl);
    setModalMode("result");
  }

  // 사진 사용하기 (상태 B → 이력서에 적용)
  function handleUsePhoto() {
    if (!capturedDataUrl) return;

    // 이력서 사진 state에 저장
    setResumeForm((prev) => {
      if (!prev) return null;
      const updated = { ...prev, photo: capturedDataUrl };
      console.log("[UsePhoto] State updated, photo set:", updated.photo ? "YES (length: " + updated.photo.length + ")" : "NO");
      return updated;
    });

    // 모달 닫기 및 카메라 정리
    handleCloseModal();
  }

  // 다시 찍기 (상태 B → A)
  function handleRetakePhoto() {
    setCapturedDataUrl(null);
    setModalMode("preview");
  }

  // ESC 키로 모달 닫기
  React.useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isModalOpen) {
        handleCloseModal();
      }
    }

    if (isModalOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => {
        window.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isModalOpen]);

  // 음성 입력 시작 (특정 필드용)
  function handleVoiceInput(fieldName: string) {
    const { createRecognition, getSpeechSupport } = require("@/lib/voice");
    const support = getSpeechSupport();
    
    if (!support.sttSupported) {
      alert("이 브라우저에서는 음성 인식이 지원되지 않습니다.");
      return;
    }

    if (listening) {
      (window as any)._recognition?.stop();
      setListening(false);
      setListeningField(null);
      return;
    }

    const recognition = createRecognition("ko-KR");
    if (!recognition) {
      alert("음성 인식을 시작할 수 없습니다.");
      return;
    }

    (window as any)._recognition = recognition;
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res || !res.isFinal) continue;
        const transcript = res[0]?.transcript?.trim();
        if (transcript && resumeForm) {
          if (fieldName === "phone") {
            // 전화번호: 숫자와 하이픈만 허용
            const cleaned = transcript.replace(/[^\d-]/g, "");
            setResumeForm((prev) => prev ? { ...prev, phone: cleaned } : null);
          } else if (fieldName === "email") {
            // 이메일: 공백 제거
            const cleaned = transcript.replace(/\s/g, "");
            setResumeForm((prev) => prev ? { ...prev, email: cleaned } : null);
          } else if (fieldName === "name") {
            // 이름: 그대로 입력
            setResumeForm((prev) => prev ? { ...prev, name: transcript } : null);
          } else if (fieldName === "gender") {
            // 성별: "남자" 또는 "여자" 키워드 인식
            const lowerTranscript = transcript.toLowerCase();
            if (lowerTranscript.includes("남자") || lowerTranscript.includes("남")) {
              setResumeForm((prev) => prev ? { ...prev, gender: "남자" } : null);
            } else if (lowerTranscript.includes("여자") || lowerTranscript.includes("여")) {
              setResumeForm((prev) => prev ? { ...prev, gender: "여자" } : null);
            } else {
              // 키워드가 없으면 그대로 입력
              setResumeForm((prev) => prev ? { ...prev, gender: transcript } : null);
            }
          } else if (fieldName === "age") {
            // 나이: 숫자만 추출
            const numbers = transcript.replace(/\D/g, "");
            if (numbers) {
              setResumeForm((prev) => prev ? { ...prev, age: numbers } : null);
            }
          } else if (fieldName === "address") {
            // 거주지: 그대로 입력
            setResumeForm((prev) => prev ? { ...prev, address: transcript } : null);
          } else if (fieldName === "desiredJob") {
            // 희망 직종: 그대로 입력
            setResumeForm((prev) => prev ? { ...prev, desiredJob: transcript } : null);
          } else if (fieldName.startsWith("career-period-")) {
            // 실습 기간: 숫자만 추출
            const numbers = transcript.replace(/\D/g, "");
            if (numbers) {
              const parts = fieldName.split("-");
              const index = parts[2] ? parseInt(parts[2]) : -1;
              if (index >= 0) {
                const newCareer = [...resumeForm.career];
                if (newCareer[index]) {
                  newCareer[index].period = numbers;
                  setResumeForm({ ...resumeForm, career: newCareer });
                }
              }
            }
          } else if (fieldName === "introduction" || fieldName === "strengths" || fieldName === "weaknesses") {
            const currentVal = resumeForm[fieldName as keyof typeof resumeForm] as string;
            setResumeForm((prev) => prev ? { ...prev, [fieldName]: (currentVal ? currentVal + " " : "") + transcript } : null);
          } else if (fieldName.startsWith("career-")) {
            const parts = fieldName.split("-");
            const index = parts[2] ? parseInt(parts[2]) : -1;
            const field = parts[3]; // organization 또는 duties
            if (index >= 0 && field) {
              const newCareer = [...resumeForm.career];
              if (newCareer[index]) {
                const currentVal = newCareer[index][field as "organization" | "duties"] || "";
                newCareer[index][field as "organization" | "duties"] = (currentVal ? currentVal + " " : "") + transcript;
                setResumeForm({ ...resumeForm, career: newCareer });
              }
            }
          }
        }
      }
    };
    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") alert("마이크 권한이 거부되었습니다.");
      setListening(false);
      setListeningField(null);
    };
    recognition.onend = () => {
      setListening(false);
      setListeningField(null);
    };
    recognition.start();
    setListening(true);
    setListeningField(fieldName);
  }

  // 인쇄
  function handlePrint() {
    window.print();
  }

  // PDF 저장
  function handleSavePDF() {
    // 안내 문구와 함께 print 다이얼로그 열기
    const message = "인쇄 창에서 'PDF로 저장'을 선택하면 파일로 저장할 수 있어요.";
    alert(message);
    window.print();
  }

  // 직무선택으로 이동
  function handleGoToJobs() {
    router.push("/jobs");
  }

  if (!formData) {
    return <div className="p-10 text-center">기본 정보를 먼저 입력해주세요.</div>;
  }

  if (loading || !resumeForm) {
    return (
      <div className="p-10 text-center">
        <p className="text-lg text-slate-600">이력서 초안을 생성하고 있습니다...</p>
      </div>
    );
  }

  return (
    <>
      <div className="py-10">
        {/* 경고 문구 */}
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>주의:</strong> 이력서는 저장되지 않습니다. 새로고침하거나 페이지를 나가면 입력한 내용이 사라질 수 있어요.
          </p>
        </div>

        {/* 안내 문구 */}
        <section className="mb-8 rounded-2xl bg-gradient-to-b from-indigo-50 to-white p-6 shadow-sm ring-1 ring-slate-200 dark:from-slate-800 dark:to-slate-900 dark:ring-slate-800">
          <h1 className="mb-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">이력서 작성</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            기본 정보를 바탕으로 이력서 초안을 생성합니다. 필요한 항목은 직접 수정하거나 추가 입력할 수 있습니다.
          </p>
        </section>

        {/* 인쇄 가능 영역 */}
        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-4 print:text-sm" id="resume-content">
          {/* 인적사항 + 사진 */}
          <div className="mb-4 print:mb-2 space-y-4 print:space-y-2">
            <h2 className="text-xl font-bold border-b-2 border-slate-300 pb-2 mb-4 print:text-lg print:pb-1 print:mb-2">인적사항</h2>
            <div className="flex items-start gap-6 print:gap-4">
              <div className="flex-1 grid grid-cols-2 gap-4 print:gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 print:text-xs">이름</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleVoiceInput("name")}
                      className="flex-shrink-0 print:hidden"
                      disabled={listening && listeningField !== "name"}
                    >
                      {listening && listeningField === "name" ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    </Button>
                    <Input
                      value={resumeForm.name}
                      onChange={(e) => setResumeForm((prev) => prev ? { ...prev, name: e.target.value } : null)}
                      className="bg-white print:text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 print:text-xs">성별</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleVoiceInput("gender")}
                      className="flex-shrink-0 print:hidden"
                      disabled={listening && listeningField !== "gender"}
                    >
                      {listening && listeningField === "gender" ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    </Button>
                    <Input
                      value={resumeForm.gender}
                      onChange={(e) => setResumeForm((prev) => prev ? { ...prev, gender: e.target.value } : null)}
                      className="bg-white print:text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 print:text-xs">나이</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleVoiceInput("age")}
                      className="flex-shrink-0 print:hidden"
                      disabled={listening && listeningField !== "age"}
                    >
                      {listening && listeningField === "age" ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    </Button>
                    <Input
                      value={resumeForm.age}
                      onChange={(e) => setResumeForm((prev) => prev ? { ...prev, age: e.target.value } : null)}
                      className="bg-white print:text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 print:text-xs">주소(사는 곳)</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleVoiceInput("address")}
                      className="flex-shrink-0 print:hidden"
                      disabled={listening && listeningField !== "address"}
                    >
                      {listening && listeningField === "address" ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    </Button>
                    <Input
                      value={resumeForm.address}
                      onChange={(e) => setResumeForm((prev) => prev ? { ...prev, address: e.target.value } : null)}
                      className="bg-white print:text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 print:text-xs">전화번호</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleVoiceInput("phone")}
                      className="flex-shrink-0 print:hidden"
                      disabled={listening && listeningField !== "phone"}
                    >
                      {listening && listeningField === "phone" ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    </Button>
                    <Input
                      value={resumeForm.phone}
                      onChange={(e) => setResumeForm((prev) => prev ? { ...prev, phone: e.target.value } : null)}
                      placeholder="010-1234-5678"
                      className="bg-white print:text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 print:text-xs">이메일(선택)</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleVoiceInput("email")}
                      className="flex-shrink-0 print:hidden"
                      disabled={listening && listeningField !== "email"}
                    >
                      {listening && listeningField === "email" ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    </Button>
                    <Input
                      type="email"
                      value={resumeForm.email}
                      onChange={(e) => setResumeForm((prev) => prev ? { ...prev, email: e.target.value } : null)}
                      placeholder="example@email.com"
                      className="bg-white print:text-xs"
                    />
                  </div>
                </div>
              </div>
              {/* 사진 영역 (인적사항 오른쪽) */}
              <div className="print:flex-shrink-0">
                <div className="w-28 h-36 print:w-24 print:h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden">
                  {resumeForm.photo ? (
                    <img src={resumeForm.photo} alt="프로필 사진" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-slate-400 text-xs p-2 print:hidden">
                      <Camera className="h-6 w-6 mx-auto mb-1" />
                      <span>사진</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-2 print:hidden">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    className="w-full"
                  >
                    <FileDown className="h-3 w-3 mr-1" />
                    사진 업로드
                  </Button>
                  {cameraSupported && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenCameraModal}
                      className="w-full"
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      사진 찍기
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 희망 직종 */}
          <div className="mb-4 print:mb-2 print:break-inside-avoid">
            <h2 className="text-xl font-bold border-b-2 border-slate-300 pb-2 mb-4 print:text-lg print:pb-1 print:mb-2">희망 직종</h2>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleVoiceInput("desiredJob")}
                className="flex-shrink-0 print:hidden"
                disabled={listening && listeningField !== "desiredJob"}
              >
                {listening && listeningField === "desiredJob" ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
              <Input
                value={resumeForm.desiredJob}
                onChange={(e) => setResumeForm((prev) => prev ? { ...prev, desiredJob: e.target.value } : null)}
                className="bg-white print:text-xs"
              />
            </div>
          </div>

          {/* 한 줄 소개 */}
          <div className="mb-4 print:mb-2 print:break-inside-avoid">
            <h2 className="text-xl font-bold border-b-2 border-slate-300 pb-2 mb-4 print:text-lg print:pb-1 print:mb-2">한 줄 소개</h2>
            <div className="flex items-start gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleVoiceInput("introduction")}
                className="flex-shrink-0 print:hidden"
                disabled={listening && listeningField !== "introduction"}
              >
                {listening && listeningField === "introduction" ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
              <Textarea
                value={resumeForm.introduction}
                onChange={(e) => setResumeForm((prev) => prev ? { ...prev, introduction: e.target.value } : null)}
                className="bg-white min-h-[80px] print:text-xs print:min-h-[60px]"
              />
            </div>
          </div>

          {/* 강점 */}
          <div className="mb-4 print:mb-2 print:break-inside-avoid">
            <h2 className="text-xl font-bold border-b-2 border-slate-300 pb-2 mb-4 print:text-lg print:pb-1 print:mb-2">강점</h2>
            <div className="flex items-start gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleVoiceInput("strengths")}
                className="flex-shrink-0 print:hidden"
                disabled={listening && listeningField !== "strengths"}
              >
                {listening && listeningField === "strengths" ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
              <Textarea
                value={resumeForm.strengths}
                onChange={(e) => setResumeForm((prev) => prev ? { ...prev, strengths: e.target.value } : null)}
                className="bg-white min-h-[100px] print:text-xs print:min-h-[60px]"
              />
            </div>
          </div>

          {/* 약점/보완 방안 */}
          <div className="mb-4 print:mb-2 print:break-inside-avoid">
            <h2 className="text-xl font-bold border-b-2 border-slate-300 pb-2 mb-4 print:text-lg print:pb-1 print:mb-2">약점 / 보완 방안</h2>
            <div className="flex items-start gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleVoiceInput("weaknesses")}
                className="flex-shrink-0 print:hidden"
                disabled={listening && listeningField !== "weaknesses"}
              >
                {listening && listeningField === "weaknesses" ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
              <Textarea
                value={resumeForm.weaknesses}
                onChange={(e) => setResumeForm((prev) => prev ? { ...prev, weaknesses: e.target.value } : null)}
                className="bg-white min-h-[100px] print:text-xs print:min-h-[60px]"
              />
            </div>
          </div>

          {/* 실습 경력 */}
          <div className="mb-4 print:mb-2 print:break-inside-avoid">
            <h2 className="text-xl font-bold border-b-2 border-slate-300 pb-2 mb-4 print:text-lg print:pb-1 print:mb-2">실습 경력</h2>
            {resumeForm.career.length === 0 ? (
              <p className="text-slate-500 text-sm print:text-xs">실습 경력이 없습니다.</p>
            ) : (
              <div className="space-y-3 print:space-y-2">
                {resumeForm.career.map((item, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-3 print:p-2 space-y-2 print:space-y-1">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 print:text-xs">기관명</label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleVoiceInput(`career-${index}-organization`)}
                          className="flex-shrink-0 print:hidden"
                          disabled={listening && listeningField !== `career-${index}-organization`}
                        >
                          {listening && listeningField === `career-${index}-organization` ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        </Button>
                        <Input
                          value={item.organization}
                          onChange={(e) => {
                            if (!resumeForm) return;
                            const newCareer = [...resumeForm.career];
                            if (newCareer[index]) {
                              newCareer[index].organization = e.target.value;
                              setResumeForm({ ...resumeForm, career: newCareer });
                            }
                          }}
                          className="bg-white print:text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 print:text-xs">기간</label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleVoiceInput(`career-period-${index}`)}
                          className="flex-shrink-0 print:hidden"
                          disabled={listening && listeningField !== `career-period-${index}`}
                        >
                          {listening && listeningField === `career-period-${index}` ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        </Button>
                        <Input
                          value={item.period}
                          onChange={(e) => {
                            if (!resumeForm) return;
                            const newCareer = [...resumeForm.career];
                            if (newCareer[index]) {
                              newCareer[index].period = e.target.value;
                              setResumeForm({ ...resumeForm, career: newCareer });
                            }
                          }}
                          className="bg-white print:text-xs"
                          placeholder="예: 4주"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 print:text-xs">주요 직무</label>
                      <div className="flex items-start gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleVoiceInput(`career-${index}-duties`)}
                          className="flex-shrink-0 print:hidden"
                          disabled={listening && listeningField !== `career-${index}-duties`}
                        >
                          {listening && listeningField === `career-${index}-duties` ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        </Button>
                        <Textarea
                          value={item.duties}
                          onChange={(e) => {
                            if (!resumeForm) return;
                            const newCareer = [...resumeForm.career];
                            if (newCareer[index]) {
                              newCareer[index].duties = e.target.value;
                              setResumeForm({ ...resumeForm, career: newCareer });
                            }
                          }}
                          className="bg-white min-h-[60px] print:text-xs print:min-h-[40px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

                {/* 촬영 모달 */}
                {isModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 dark:bg-slate-800">
                      {modalMode === "preview" ? (
                        /* 상태 A: 미리보기 단계 */
                        <>
                          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
                            사진 촬영
                          </h2>
                          {cameraError ? (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                              <p className="text-sm text-red-800 dark:text-red-200 mb-3">{cameraError}</p>
                              <Button
                                variant="outline"
                                onClick={handleSwitchToUpload}
                                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                              >
                                <FileDown className="h-4 w-4 mr-1" />
                                업로드로 전환
                              </Button>
                            </div>
                          ) : (
                            <div className="mb-4">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full rounded-lg border-2 border-slate-300 bg-slate-900"
                                style={{ transform: "scaleX(-1)" }}
                              />
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={handleCloseModal}
                            >
                              닫기
                            </Button>
                            {!cameraError && (
                              <Button
                                onClick={handleCapturePhoto}
                                disabled={!videoReady}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Camera className="h-4 w-4 mr-1" />
                                촬영하기
                              </Button>
                            )}
                          </div>
                        </>
                      ) : (
                        /* 상태 B: 촬영 결과 미리보기 */
                        <>
                          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
                            촬영 결과
                          </h2>
                          {capturedDataUrl && (
                            <div className="mb-4">
                              <img
                                src={capturedDataUrl}
                                alt="촬영된 사진"
                                className="w-full rounded-lg border-2 border-slate-300"
                              />
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={handleRetakePhoto}
                            >
                              다시찍기
                            </Button>
                            <Button
                              onClick={handleUsePhoto}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              사진 사용하기
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 버튼 영역 */}
                <div className="mt-6 flex items-center justify-between gap-4 print:hidden">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={handlePrint}
                      className="flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      인쇄하기
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSavePDF}
                      className="flex items-center gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      저장하기(PDF)
                    </Button>
                  </div>
                  <Button
                    onClick={handleGoToJobs}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    직무선택으로 이동
                  </Button>
                </div>
      </div>

      {/* 인쇄용 스타일 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #resume-content,
          #resume-content * {
            visibility: visible;
          }
          #resume-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 1rem;
          }
          #resume-content h2 {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          #resume-content > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          #resume-content .print\\:break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* 카메라 관련 UI 인쇄 시 숨김 */
          #resume-content video,
          #resume-content button[class*="카메라"],
          #resume-content button:has(svg[class*="Camera"]) {
            display: none !important;
            visibility: hidden !important;
          }
          @page {
            margin: 0.8cm;
            size: A4;
          }
        }
      `}</style>
    </>
  );
}
