"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Send, Square, Volume2, VolumeX, UserCircle, Video, VideoOff, X, Circle } from "lucide-react";
import { createRecognition, getSpeechSupport, speak, stopSpeaking } from "@/lib/voice";
import { useVoice } from "@/lib/state/voice-context";
import { getSelectedJob } from "@/lib/state/profile";
import { ttsPlayer } from "./ttsPlayer";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// 직무별 이미지 포커스 위치 (얼굴이 위쪽에 보이도록 조정)
const imagePositionMap: Record<string, string> = {
  "care-support": "center 20%",
  "customer-service": "center 25%",
  "assembly-packaging": "center 20%",
};

function getImagePosition(jobId: string | null): string {
  if (!jobId) return "center 150px";
  return imagePositionMap[jobId] ?? "center 150px";
}

/** 직무별 면접관 이미지 경로 배열 (서버에서 읽은 실제 파일 목록) */
type InterviewerMap = Record<string, string[]>;

function pickRandomFromList(list: string[]): string | null {
  if (!list.length) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx] ?? null;
}

const DEFAULT_FALLBACK_JOB = "office-support";

type Props = {
  interviewerMap: InterviewerMap;
};

export default function ChatPageClient({ interviewerMap }: Props) {
  const [started, setStarted] = React.useState(false);
  const [userDraftAnswer, setUserDraftAnswer] = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [messages, setMessages] = React.useState<Array<{ role: "system" | "user" | "assistant"; content: string }>>([]);
  const [currentInterviewerMessage, setCurrentInterviewerMessage] = React.useState("");
  const [currentUserMessage, setCurrentUserMessage] = React.useState("");
  const [displayInterviewerText, setDisplayInterviewerText] = React.useState("");
  const [displayUserText, setDisplayUserText] = React.useState("");
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  const [interviewerImage, setInterviewerImage] = React.useState<string | null>(null);

  // 면접 종료 및 결과 CTA 상태
  const [isInterviewEnded, setIsInterviewEnded] = React.useState(false);
  const [showResultCTA, setShowResultCTA] = React.useState(false);
  const [finalEvaluationText, setFinalEvaluationText] = React.useState<string | null>(null);
  const [showResultModal, setShowResultModal] = React.useState(false);
  const [extraFeedbackText, setExtraFeedbackText] = React.useState<string | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = React.useState(false);
  
  // 녹화 영상 상태
  const [recordingUrl, setRecordingUrl] = React.useState<string | null>(null);
  const recordingBlobRef = React.useRef<Blob | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  
  // 오늘 배운 점 상태
  const [learnedText, setLearnedText] = React.useState("");
  const [isListeningLearned, setIsListeningLearned] = React.useState(false);
  const learnedRecognitionRef = React.useRef<any>(null);
  const [speechSupported, setSpeechSupported] = React.useState(false);
  
  // PDF 생성용 ref
  const pdfRef = React.useRef<HTMLDivElement | null>(null);

  const router = useRouter();

  // 웹캠 상태 관리
  const [camOn, setCamOn] = React.useState(false);
  const [camError, setCamError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // 입력창 높이 측정 (PIP 위치 조정용)
  const [inputBarHeight, setInputBarHeight] = React.useState(0);
  const inputBarRef = React.useRef<HTMLDivElement | null>(null);

  const support = getSpeechSupport();
  const { screenReaderEnabled, interviewVoiceEnabled, setInterviewVoiceEnabled } = useVoice();
  const typingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const userTypingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const hasReadGuideRef = React.useRef<boolean>(false);
  const [ttsState, setTtsState] = React.useState(ttsPlayer.getState());

  const guideText = "면접 시작 버튼을 누르시면 면접관과의 대화가 실행됩니다.";

  React.useEffect(() => {
    if (screenReaderEnabled && !hasReadGuideRef.current) {
      stopSpeaking();
      speak(guideText, { lang: "ko-KR" });
      hasReadGuideRef.current = true;
    }
    return () => {
      if (!screenReaderEnabled) hasReadGuideRef.current = false;
    };
  }, [screenReaderEnabled]);

  React.useEffect(() => {
    return () => {
      hasReadGuideRef.current = false;
      stopSpeaking();
    };
  }, []);

  React.useEffect(() => {
    async function loadSelectedJob() {
      const jobId = await getSelectedJob();
      console.log("[ChatPage] Loaded jobId:", jobId);
      setSelectedJobId(jobId);
    }
    loadSelectedJob();
    
    // 음성 인식 지원 확인
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  React.useEffect(() => {
    const unsubscribe = ttsPlayer.subscribe(() => setTtsState(ttsPlayer.getState()));
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    return () => { ttsPlayer.stop(); };
  }, []);

  React.useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      if (userTypingIntervalRef.current) clearInterval(userTypingIntervalRef.current);
    };
  }, []);

  // 입력창 높이 측정 (ResizeObserver)
  React.useEffect(() => {
    if (!inputBarRef.current) return;

    const updateHeight = () => {
      if (inputBarRef.current) {
        setInputBarHeight(inputBarRef.current.offsetHeight);
      }
    };

    // 초기 높이 설정
    updateHeight();

    // ResizeObserver로 높이 변화 감지
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(inputBarRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [started]); // started가 변경될 때마다 재설정

  // 웹캠 cleanup: 언마운트 시 스트림 정리
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // 직무 변경 시 해당 직무 이미지 목록에서 랜덤 1장 선택 (미선택 시 기본 직무 이미지 사용)
  React.useEffect(() => {
    const jobId = selectedJobId ?? DEFAULT_FALLBACK_JOB;
    const list = interviewerMap[jobId] ?? [];
    if (!list.length) {
      setInterviewerImage(null);
      return;
    }
    setInterviewerImage(pickRandomFromList(list));
  }, [selectedJobId, interviewerMap]);

  const animateText = (fullText: string, setFn: (text: string) => void, speed = 30) => {
    setFn("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setFn(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(interval);
    }, speed);
  };

  const showInterviewerMessage = (fullText: string) => {
    setCurrentInterviewerMessage(fullText);
    animateText(fullText, setDisplayInterviewerText);
  };

  const showUserMessage = (fullText: string) => {
    setCurrentUserMessage(fullText);
    animateText(fullText, setDisplayUserText);
  };

  async function startInterview() {
    setStarted(true);
    setIsInterviewEnded(false);
    setShowResultCTA(false);
    setFinalEvaluationText(null);
    setExtraFeedbackText(null);
    setShowResultModal(false);
    setLearnedText("");
    const initialMessage = "안녕하세요. 면접 시작하겠습니다. 준비되셨다면 자기소개 부탁드립니다.";
    setCurrentUserMessage("");
    setCurrentInterviewerMessage("");
    setMessages([{ role: "assistant", content: initialMessage }]);
    showInterviewerMessage(initialMessage);
    playInterviewTTS(initialMessage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 평가 메시지 추출 함수
  function extractFinalEvaluation(messages: Array<{ role: string; content: string }>): string | null {
    const patterns = [/총점/i, /100점/i, /가산점/i, /감점/i, /점수/i];
    const assistants = messages.filter((m) => m.role === "assistant");
    
    // 뒤에서부터 평가 키워드가 있는 메시지 찾기
    for (let i = assistants.length - 1; i >= 0; i--) {
      const content = (assistants[i].content ?? "").toString();
      if (patterns.some((re) => re.test(content))) {
        console.log("[Interview] Evaluation message found at index", i);
        return content;
      }
    }
    
    // 패턴이 안 잡히면 마지막 assistant 메시지 fallback
    if (assistants.length > 0) {
      const lastContent = assistants[assistants.length - 1].content ?? null;
      console.log("[Interview] Using last assistant message as fallback");
      return lastContent;
    }
    
    console.log("[Interview] No evaluation message found");
    return null;
  }

  // 면접 종료 처리 공통 함수
  function handleInterviewEnd(evaluationText: string, allMessages: Array<{ role: string; content: string }>) {
    if (isInterviewEnded) {
      console.log("[Interview] Already ended, skipping");
      return;
    }

    console.log("[Interview] ✅ Interview ended!");
    setIsInterviewEnded(true);
    
    // 평가 메시지 추출 및 저장
    const extractedText = extractFinalEvaluation(allMessages) || evaluationText;
    setFinalEvaluationText(extractedText);
    
    // 약간의 딜레이 후 CTA 표시
    setTimeout(() => {
      console.log("[Interview] Showing result CTA");
      setShowResultCTA(true);
    }, 1500);
  }

  // 면접 종료 감지 함수 (직무 무관, 3중 방식)
  function checkInterviewEnd(assistantText: string, allMessages: Array<{ role: string; content: string }>): boolean {
    if (isInterviewEnded) {
      console.log("[Interview] Already ended, skipping check");
      return false;
    }

    const text = assistantText.trim();
    
    // (1) 구조화 신호 확인 (현재는 없지만 확장 가능)
    // if (assistantMessage.meta?.isInterviewEnd === true) { ... }
    
    // (2) 종료 패턴 감지 (직무 무관, 더 넓게)
    const endPatterns = [
      /수고하셨습니다/i,
      /면접(을|이)\s*마치/i,
      /면접\s*종료/i,
      /이상(으)?로\s*면접/i,
      /마지막\s*평가/i,
      /면접을\s*마치겠습니다/i,
      /면접(이|가)\s*끝났습니다/i,
      /평가(를|를\s*말씀|결과)/i,
      /면접\s*평가를\s*하겠습니다/i,
      /면접에\s*참여해\s*주셔서\s*감사합니다/i,
      /면접에\s*참여해\s*주셔서\s*감사/i,
      /참여해\s*주셔서\s*감사합니다/i,
      /이제\s*면접\s*평가를/i,
      /면접\s*평가/i,
    ];

    // 평가 키워드 감지 (총점, 가산점, 감점 등이 있으면 확실히 평가 단계)
    const evaluationKeywords = [
      /총\s*점수/i,
      /총점/i,
      /가산점/i,
      /감점/i,
      /100점\s*만점/i,
      /총점\s*[:：]/i,
      /가산점\s*[:：]/i,
      /감점\s*[:：]/i,
      /총점\s*[:\s]\s*\d+/i,
      /가산점\s*[:\s]/i,
      /감점\s*[:\s]/i,
    ];

    // 패턴 매칭
    const isEndByPattern = endPatterns.some((re) => re.test(text));
    const hasEvaluationKeywords = evaluationKeywords.some((re) => re.test(text));
    
    // 평가 관련 키워드가 있으면 확실히 종료
    const isEndByText = isEndByPattern || hasEvaluationKeywords;
    
    // 디버깅 로그
    console.log("[Interview] Checking end condition:");
    console.log("  - Pattern match:", isEndByPattern);
    console.log("  - Evaluation keywords:", hasEvaluationKeywords);
    console.log("  - Text preview:", text.substring(0, 150));
    
    if (isEndByText) {
      handleInterviewEnd(text, allMessages);
      return true;
    }

    return false;
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setCurrentUserMessage("");
    showUserMessage(text);
    setUserDraftAnswer("");
    setLoading(true);
    const userMessage = { role: "user" as const, content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    console.log("[ChatPage] Sending message, history length:", updatedMessages.length);
    if (updatedMessages.length >= 2) {
      const lastTwo = updatedMessages.slice(-2);
      console.log("[ChatPage] Last 2 messages:", lastTwo.map((m) => ({ role: m.role, contentLength: m.content.length })));
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, jobId: selectedJobId }),
      });
      if (!res.ok) throw new Error("API 요청 실패");
      if (!res.body) throw new Error("응답을 받을 수 없습니다");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8", { fatal: false });
      let assistant = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
      }
      const finalChunk = decoder.decode();
      if (finalChunk) assistant += finalChunk;

      const displayText = assistant.trim();
      const ttsText = displayText;

      const lastAssistantMessage = updatedMessages.filter((m) => m.role === "assistant").pop();
      if (lastAssistantMessage && lastAssistantMessage.content === displayText) {
        console.warn("[ChatPage] Duplicate response detected, forcing regeneration");
        const fallbackMessage = "죄송합니다. 다른 질문을 드리겠습니다. 지원 동기가 어떻게 되시나요?";
        setMessages([...updatedMessages, { role: "assistant", content: fallbackMessage }]);
        showInterviewerMessage(fallbackMessage);
        playInterviewTTS(fallbackMessage);
        setLoading(false);
        return;
      }

      console.log("[ChatPage] API Response received, length:", displayText.length);
      console.log("[ChatPage] Response preview:", displayText.substring(0, 200));
      
      const finalMessages = [...updatedMessages, { role: "assistant" as const, content: displayText }];
      setMessages(finalMessages);
      showInterviewerMessage(displayText);
      playInterviewTTS(ttsText);

      // 면접 종료 감지 (메시지 표시 후 실행)
      const isEnded = checkInterviewEnd(displayText, finalMessages);
      if (isEnded) {
        console.log("[Interview] Interview ended detected, showing CTA in 1.5s");
      }
    } catch (e) {
      console.error("Send message error:", e);
      const errorMessage = "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      showInterviewerMessage(errorMessage);
      playInterviewTTS(errorMessage);
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }

  function handleRecognizeToggle() {
    if (!support.sttSupported) return;
    if (listening) {
      (window as any)._recognition?.stop();
      setListening(false);
      return;
    }
    const recognition = createRecognition("ko-KR");
    if (!recognition) return;
    (window as any)._recognition = recognition;
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res.isFinal) continue;
        const transcript = res[0].transcript.trim();
        if (transcript) setUserDraftAnswer((prev) => (prev ? prev + " " : "") + transcript);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  }

  function handleSubmit() {
    if (!userDraftAnswer.trim() || loading) return;
    sendMessage(userDraftAnswer);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (userDraftAnswer.trim() && !loading) sendMessage(userDraftAnswer.trim());
    }
  };

  function playInterviewTTS(messageText: string) {
    if (interviewVoiceEnabled) ttsPlayer.enqueue(messageText, selectedJobId);
  }

  // 다음 면접관: 같은 직무 목록에서 다시 랜덤 선택
  function handleNextInterviewer() {
    const jobId = selectedJobId ?? DEFAULT_FALLBACK_JOB;
    const list = interviewerMap[jobId] ?? [];
    if (!list.length) return;
    setInterviewerImage(pickRandomFromList(list));
  }

  // 웹캠 시작 함수
  async function startCamera() {
    console.log("[Camera] Starting camera...");
    setCamError(null);
    
    // 브라우저 지원 확인
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = "이 브라우저에서는 카메라를 지원하지 않아요";
      console.error("[Camera] Browser not supported");
      setCamError(errorMsg);
      setCamOn(false);
      return;
    }

    try {
      console.log("[Camera] Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      console.log("[Camera] Stream obtained:", stream);
      streamRef.current = stream;
      
      // video 요소가 렌더링될 때까지 약간 대기
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      if (videoRef.current) {
        console.log("[Camera] Setting srcObject to video element");
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          console.log("[Camera] Video play started");
        } catch (playErr) {
          console.error("[Camera] Play error:", playErr);
        }
        setCamOn(true);
      } else {
        console.error("[Camera] videoRef.current is null");
        // video 요소가 없어도 스트림은 받았으므로 상태는 켜기로 설정
        setCamOn(true);
        // 나중에 video 요소가 마운트되면 스트림 연결
        setTimeout(() => {
          if (videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(console.error);
          }
        }, 200);
      }
    } catch (err: any) {
      console.error("[Camera] Access error:", err);
      let errorMsg = "카메라 권한이 필요해요";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "카메라 권한이 거부되었어요. 브라우저 설정에서 권한을 허용해주세요.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "카메라를 찾을 수 없어요. 웹캠이 연결되어 있는지 확인해주세요.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMsg = "카메라를 사용할 수 없어요. 다른 앱에서 사용 중일 수 있습니다.";
      }
      setCamError(errorMsg);
      setCamOn(false);
      
      // 스트림이 부분적으로 생성되었을 수 있으므로 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }

  // 웹캠 종료 함수
  async function stopCamera() {
    // 녹화 중이면 먼저 중지
    if (isRecording) {
      await stopRecording();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamOn(false);
    setCamError(null);
  }

  // 카메라 토글 핸들러
  async function handleCameraToggle() {
    if (camOn) {
      // 녹화 중이면 먼저 중지
      if (isRecording) {
        await stopRecording();
      }
      stopCamera();
    } else {
      startCamera();
    }
  }

  // 녹화 시작 함수
  function startRecording() {
    if (!streamRef.current) {
      alert("먼저 카메라를 켜주세요.");
      return;
    }

    if (isRecording) {
      console.log("[Recording] Already recording");
      return;
    }

    try {
      chunksRef.current = [];
      
      // 지원되는 MIME 타입 찾기 (음성 포함)
      const options = [
        { mimeType: "video/webm;codecs=vp9,opus" },
        { mimeType: "video/webm;codecs=vp8,opus" },
        { mimeType: "video/webm" },
        { mimeType: "video/mp4" },
      ].find((opt) => MediaRecorder.isTypeSupported(opt.mimeType)) || {};

      const recorder = new MediaRecorder(streamRef.current, options);
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          console.log("[Recording] Data chunk received:", e.data.size, "bytes");
          chunksRef.current.push(e.data);
        }
      };

      // onstop은 stopRecording 함수에서 설정하므로 여기서는 설정하지 않음
      recorder.onerror = (e) => {
        console.error("[Recording] Error:", e);
        setIsRecording(false);
        recorderRef.current = null;
      };

      // timeslice를 제거하여 녹화 종료 시까지 모든 데이터 수집
      // timeslice를 사용하면 마지막 chunk가 누락될 수 있음
      recorder.start();
      console.log("[Recording] Started with MIME type:", recorder.mimeType);
      recorderRef.current = recorder;
      setIsRecording(true);
      console.log("[Recording] Recording started");
    } catch (err) {
      console.error("[Recording] Failed to start:", err);
      alert("녹화를 시작할 수 없습니다.");
    }
  }

  // 녹화 중지 함수 (Promise 반환으로 완료 보장)
  function stopRecording(): Promise<{ url: string | null; blob: Blob | null }> {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      
      if (!rec || rec.state === "inactive") {
        // 이미 중지되었거나 녹화 중이 아님
        resolve({ url: recordingUrl, blob: recordingBlobRef.current });
        return;
      }

      // 기존 onstop이 있으면 제거하고 새로 설정
      rec.onstop = () => {
        console.log("[Recording] onstop called, chunks count:", chunksRef.current.length);
        console.log("[Recording] Total chunks size:", chunksRef.current.reduce((sum, chunk) => sum + (chunk instanceof Blob ? chunk.size : 0), 0), "bytes");
        
        // 모든 chunks를 수집했는지 확인
        if (chunksRef.current.length === 0) {
          console.warn("[Recording] No chunks collected!");
        }
        
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "video/webm",
        });
        
        console.log("[Recording] Final blob size:", blob.size, "bytes, type:", blob.type);
        
        // 이전 URL 정리
        if (recordingUrl) {
          URL.revokeObjectURL(recordingUrl);
        }
        
        const url = URL.createObjectURL(blob);
        recordingBlobRef.current = blob;
        setRecordingUrl(url);
        setIsRecording(false);
        recorderRef.current = null;
        
        console.log("[Recording] Recording stopped, blob created:", blob.size, "bytes");
        resolve({ url, blob });
      };

      // stop() 호출 전에 마지막 dataavailable 이벤트를 강제로 발생시키기 위해 requestData 호출
      if (rec.state === "recording") {
        rec.requestData();
      }
      
      rec.stop();
      setIsRecording(false);
    });
  }

  // 오늘 배운 점 음성 입력 핸들러
  function handleLearnedVoiceToggle() {
    if (!speechSupported) {
      alert("이 브라우저에서는 음성 입력을 지원하지 않습니다.");
      return;
    }

    if (isListeningLearned) {
      // 음성 입력 중지
      if (learnedRecognitionRef.current) {
        learnedRecognitionRef.current.stop();
        learnedRecognitionRef.current = null;
      }
      setIsListeningLearned(false);
    } else {
      // 음성 입력 시작
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        alert("음성 인식을 사용할 수 없습니다.");
        return;
      }

      const recognition = new SR();
      recognition.lang = "ko-KR";
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setLearnedText((prev) => (prev ? prev + "\n" : "") + transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListeningLearned(false);
        if (event.error === "not-allowed") {
          alert("마이크 권한이 필요합니다. 브라우저 설정에서 권한을 허용해주세요.");
        }
      };

      recognition.onend = () => {
        setIsListeningLearned(false);
        learnedRecognitionRef.current = null;
      };

      try {
        recognition.start();
        learnedRecognitionRef.current = recognition;
        setIsListeningLearned(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
        setIsListeningLearned(false);
      }
    }
  }

  // PDF 내보내기 함수 (텍스트 기반, 한글 폰트 임베드)
  async function handleExportPDF() {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      
      // 한글 폰트 로드 및 임베드 (비동기)
      let fontLoaded = false;
      let fontName = "helvetica";
      let fontBold: "bold" | "normal" = "bold";
      
      try {
        // 로컬 폰트 파일 시도 (public/fonts/NotoSansKR-Regular.ttf)
        console.log("[PDF] Loading Korean fonts from /fonts/...");
        const localFontResponse = await fetch("/fonts/NotoSansKR-Regular.ttf");
        if (localFontResponse.ok) {
          console.log("[PDF] Regular font file found, loading...");
          const fontArrayBuffer = await localFontResponse.arrayBuffer();
          console.log("[PDF] Font file size:", fontArrayBuffer.byteLength, "bytes");
          
          // ArrayBuffer를 base64로 변환 (큰 파일 처리)
          const bytes = new Uint8Array(fontArrayBuffer);
          let binary = "";
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const fontBase64 = btoa(binary);
          console.log("[PDF] Font converted to base64, length:", fontBase64.length);
          
          pdf.addFileToVFS("NotoSansKR-Regular.ttf", fontBase64);
          pdf.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal");
          console.log("[PDF] Regular font added to VFS");
          
          // Bold 폰트도 시도
          try {
            const boldResponse = await fetch("/fonts/NotoSansKR-Bold.ttf");
            if (boldResponse.ok) {
              console.log("[PDF] Bold font file found, loading...");
              const boldArrayBuffer = await boldResponse.arrayBuffer();
              const boldBytes = new Uint8Array(boldArrayBuffer);
              let boldBinary = "";
              for (let i = 0; i < boldBytes.length; i += chunkSize) {
                const chunk = boldBytes.subarray(i, i + chunkSize);
                boldBinary += String.fromCharCode(...chunk);
              }
              const boldBase64 = btoa(boldBinary);
              pdf.addFileToVFS("NotoSansKR-Bold.ttf", boldBase64);
              pdf.addFont("NotoSansKR-Bold.ttf", "NotoSansKR", "bold");
              console.log("[PDF] Bold font added to VFS");
            } else {
              console.warn("[PDF] Bold font file not found, using normal font for bold");
            }
          } catch (e) {
            console.warn("[PDF] Bold font loading error:", e);
          }
          
          // 폰트 설정 테스트
          try {
            pdf.setFont("NotoSansKR", "normal");
            fontName = "NotoSansKR";
            fontBold = "bold";
            fontLoaded = true;
            console.log("[PDF] ✅ Korean font loaded and set successfully");
          } catch (setFontError) {
            console.error("[PDF] Failed to set NotoSansKR font:", setFontError);
            fontLoaded = false;
          }
        } else {
          console.error("[PDF] ❌ Korean font file not found at /fonts/NotoSansKR-Regular.ttf, status:", localFontResponse.status);
        }
      } catch (fontError) {
        console.error("[PDF] ❌ Korean font loading failed:", fontError);
      }
      
      // 폰트가 로드되지 않았으면 기본 폰트 사용 (한글 깨짐 가능)
      if (!fontLoaded) {
        pdf.setFont("helvetica", "normal");
        fontName = "helvetica";
        fontBold = "bold";
        console.error("[PDF] ⚠️ Korean font NOT loaded! Korean characters will appear broken.");
        console.error("[PDF] Please check if fonts are in public/fonts/ folder");
        // 사용자에게 알림 (폰트 파일이 있다고 했으므로 경고만)
        console.warn("[PDF] Font files exist but loading failed. Check browser console for details.");
      } else {
        // 폰트가 로드되었는지 다시 한 번 확인
        try {
          pdf.setFont("NotoSansKR", "normal");
          const testText = "테스트";
          const testWidth = pdf.getTextWidth(testText);
          console.log("[PDF] Font test - '테스트' width:", testWidth, "mm");
          if (testWidth > 0) {
            console.log("[PDF] ✅ Font is working correctly");
          }
        } catch (testError) {
          console.error("[PDF] Font test failed:", testError);
          fontLoaded = false;
          fontName = "helvetica";
        }
      }
      
      // 페이지 크기 및 여백 설정
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15; // 좌우 여백 15mm (12mm -> 15mm로 증가)
      const contentWidth = pageWidth - margin * 2;
      let yPosition = margin;
      const lineHeight = 7; // 기본 줄 간격 (mm) (6mm -> 7mm로 증가)
      const sectionSpacing = 12; // 섹션 간 간격 (8mm -> 12mm로 증가)
      
      // 페이지 넘김 체크 함수
      const checkPageBreak = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };
      
      // 텍스트 추가 함수 (자동 줄바꿈 및 페이지 넘김)
      const addText = (text: string, fontSize: number, isBold: boolean = false, indent: number = 0) => {
        // 폰트 설정 (한글 폰트가 로드되었는지 확인)
        pdf.setFontSize(fontSize);
        
        // 폰트가 로드되었는지 명확히 확인하고 설정
        if (fontLoaded && fontName === "NotoSansKR") {
          try {
            if (isBold && fontBold === "bold") {
              pdf.setFont("NotoSansKR", "bold");
            } else {
              pdf.setFont("NotoSansKR", "normal");
            }
          } catch (e) {
            console.warn("[PDF] Failed to set NotoSansKR font, using fallback:", e);
            pdf.setFont(fontName, isBold ? "bold" : "normal");
          }
        } else {
          // 기본 폰트 사용 (한글 깨짐 가능)
          pdf.setFont(fontName, isBold ? "bold" : "normal");
        }
        
        const lines = pdf.splitTextToSize(text, contentWidth - indent);
        // 줄간격 개선: fontSize * 0.4 -> fontSize * 0.5 (더 넓은 줄간격)
        const lineSpacing = fontSize * 0.5;
        const textHeight = lines.length * lineSpacing; // 대략적인 높이 계산
        
        checkPageBreak(textHeight);
        
        lines.forEach((line: string) => {
          // 폰트 재설정 (매번 확인)
          if (fontLoaded && fontName === "NotoSansKR") {
            try {
              pdf.setFont("NotoSansKR", isBold && fontBold === "bold" ? "bold" : "normal");
            } catch (e) {
              pdf.setFont(fontName, isBold ? "bold" : "normal");
            }
          }
          pdf.text(line, margin + indent, yPosition);
          yPosition += lineSpacing; // 개선된 줄 간격
        });
        
        return textHeight;
      };
      
      // 제목 (폰트 크기 증가: 18 -> 20)
      pdf.setFontSize(20);
      if (fontLoaded && fontName === "NotoSansKR") {
        try {
          pdf.setFont("NotoSansKR", "bold");
        } catch (e) {
          pdf.setFont(fontName, "bold");
        }
      } else {
        pdf.setFont(fontName, "bold");
      }
      const titleText = "면접 결과";
      const titleWidth = pdf.getTextWidth(titleText);
      pdf.text(titleText, (pageWidth - titleWidth) / 2, yPosition);
      yPosition += lineHeight * 2;
      checkPageBreak(sectionSpacing);
      
      // 면접관 평가 섹션 (원문) (폰트 크기 증가: 15 -> 16)
      pdf.setFontSize(16);
      if (fontLoaded && fontName === "NotoSansKR") {
        try {
          pdf.setFont("NotoSansKR", "bold");
        } catch (e) {
          pdf.setFont(fontName, fontBold);
        }
      } else {
        pdf.setFont(fontName, fontBold);
      }
      pdf.text("면접관 평가 (원문)", margin, yPosition);
      yPosition += lineHeight * 1.2;
      
      let evaluationText = finalEvaluationText || extractFinalEvaluation(messages) || "평가 문구를 찾지 못했습니다.";
      
      // 반복되는 패턴을 확실하게 제거
      // 끝부분에서 반복되는 문구를 찾아 제거
      const endDuplicatePatterns = [
        /\n*감사합니다\.\s*이제\s*면접\s*점수를\s*말씀드리겠습니다\.\s*기본\s*점수는\s*50점입니다\.\s*$/i,
        /\n*이제\s*면접\s*점수를\s*말씀드리겠습니다\.\s*기본\s*점수는\s*50점입니다\.\s*$/i,
        /\n*감사합니다\.\s*이제\s*면접\s*점수를\s*말씀드리겠습니다\.\s*$/i,
        /\n*기본\s*점수는\s*50점입니다\.\s*$/i,
        /\n*감사합니다\.\s*$/i,
      ];
      
      // 끝부분에서 중복 패턴 제거 (여러 번 반복될 수 있으므로)
      let previousLength = 0;
      while (previousLength !== evaluationText.length) {
        previousLength = evaluationText.length;
        for (const pattern of endDuplicatePatterns) {
          evaluationText = evaluationText.replace(pattern, '');
        }
        evaluationText = evaluationText.trim();
      }
      
      // 연속된 공백과 줄바꿈 정리
      evaluationText = evaluationText.replace(/\n{3,}/g, '\n\n').replace(/\s{2,}/g, ' ').trim();
      
      addText(evaluationText, 14, false, 0); // 본문 폰트 크기 증가: 13 -> 14
      yPosition += sectionSpacing;
      checkPageBreak(sectionSpacing);
      
      // 추가 피드백 섹션 (폰트 크기 증가: 15 -> 16)
      if (extraFeedbackText) {
        pdf.setFontSize(16);
        if (fontLoaded && fontName === "NotoSansKR") {
          try {
            pdf.setFont("NotoSansKR", "bold");
          } catch (e) {
            pdf.setFont(fontName, fontBold);
          }
        } else {
          pdf.setFont(fontName, fontBold);
        }
        pdf.text("추가 피드백", margin, yPosition);
        yPosition += lineHeight * 1.2;
        
        // 마크다운 서식 제거 후 텍스트만 출력
        const plainFeedback = extraFeedbackText
          .replace(/\*\*(.+?)\*\*/g, "$1") // 굵게 제거
          .replace(/\n/g, " "); // 줄바꿈을 공백으로
        
        addText(plainFeedback, 14, false, 0); // 본문 폰트 크기 증가: 13 -> 14
        yPosition += sectionSpacing;
        checkPageBreak(sectionSpacing);
      }
      
      // 대화 내역 섹션 (폰트 크기 증가: 15 -> 16)
      pdf.setFontSize(16);
      if (fontLoaded && fontName === "NotoSansKR") {
        try {
          pdf.setFont("NotoSansKR", "bold");
        } catch (e) {
          pdf.setFont(fontName, fontBold);
        }
      } else {
        pdf.setFont(fontName, fontBold);
      }
      pdf.text("대화 내역", margin, yPosition);
      yPosition += lineHeight * 1.2;
      
      messages.forEach((msg) => {
        checkPageBreak(lineHeight * 3);
        
        // 라벨 (면접관/나) (폰트 크기 증가: 13 -> 14)
        const label = msg.role === "assistant" ? "면접관:" : "나:";
        pdf.setFontSize(14);
        if (fontLoaded && fontName === "NotoSansKR") {
          try {
            pdf.setFont("NotoSansKR", "bold");
          } catch (e) {
            pdf.setFont(fontName, fontBold);
          }
        } else {
          pdf.setFont(fontName, fontBold);
        }
        pdf.text(label, margin, yPosition);
        yPosition += lineHeight * 0.8;
        
        // 내용 (들여쓰기) (폰트 크기 증가: 13 -> 14)
        const content = msg.content || "";
        addText(content, 14, false, 6); // 6mm 들여쓰기
        yPosition += lineHeight * 0.8; // 메시지 간 간격 증가: 0.5 -> 0.8
      });
      
      yPosition += sectionSpacing;
      checkPageBreak(sectionSpacing);
      
      // 오늘 배운 점 섹션 (폰트 크기 증가: 15 -> 16)
      if (learnedText) {
        pdf.setFontSize(16);
        if (fontLoaded && fontName === "NotoSansKR") {
          try {
            pdf.setFont("NotoSansKR", "bold");
          } catch (e) {
            pdf.setFont(fontName, fontBold);
          }
        } else {
          pdf.setFont(fontName, fontBold);
        }
        pdf.text("오늘 배운 점", margin, yPosition);
        yPosition += lineHeight * 1.2;
        
        addText(learnedText, 14, false, 0); // 본문 폰트 크기 증가: 13 -> 14
        yPosition += sectionSpacing;
      }
      
      // 생성일시
      checkPageBreak(lineHeight * 2);
      pdf.setFontSize(11);
      if (fontLoaded && fontName === "NotoSansKR") {
        try {
          pdf.setFont("NotoSansKR", "normal");
        } catch (e) {
          pdf.setFont(fontName, "normal");
        }
      } else {
        pdf.setFont(fontName, "normal");
      }
      const timestamp = new Date().toLocaleString("ko-KR");
      const timestampWidth = pdf.getTextWidth(`생성일시: ${timestamp}`);
      pdf.text(`생성일시: ${timestamp}`, (pageWidth - timestampWidth) / 2, yPosition);
      
      // 파일명 생성
      const now = new Date();
      const filename = `interview_result_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.pdf`;

      pdf.save(filename);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("PDF 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }

  // 추가 피드백 생성 함수
  async function generateExtraFeedback() {
    if (!finalEvaluationText || isLoadingFeedback) return;

    setIsLoadingFeedback(true);
    try {
      // 전체 대화 내역 전송 (참여자 답변 기반 피드백을 위해)
      const allMessages = messages.filter(m => m.role !== "system"); // system 메시지 제외
      
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationText: finalEvaluationText,
          recentMessages: allMessages.map(m => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExtraFeedbackText(data.feedback || null);
      } else {
        console.error("Failed to generate feedback");
      }
    } catch (error) {
      console.error("Feedback generation error:", error);
    } finally {
      setIsLoadingFeedback(false);
    }
  }

  // 결과 모달이 열릴 때 녹화 자동 종료 및 피드백 생성 (안전장치)
  React.useEffect(() => {
    if (showResultModal) {
      if (isRecording) {
        console.log("[Result] Modal opened, stopping recording...");
        stopRecording().catch(console.error);
      }
      // 추가 피드백 생성
      if (finalEvaluationText && !extraFeedbackText) {
        generateExtraFeedback();
      }
    }
  }, [showResultModal]);

  // 녹화 영상 정리
  React.useEffect(() => {
    return () => {
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
    };
  }, [recordingUrl]);

  const imagePosition = getImagePosition(selectedJobId ?? DEFAULT_FALLBACK_JOB);
  const effectiveJobId = selectedJobId ?? DEFAULT_FALLBACK_JOB;
  const listForJob = interviewerMap[effectiveJobId] ?? [];
  const canNextInterviewer = listForJob.length > 1;

  const backgroundStyle: React.CSSProperties = interviewerImage
    ? {
        backgroundImage: `url("${interviewerImage}")`,
        backgroundSize: "contain",
        backgroundPosition: imagePosition,
        backgroundRepeat: "no-repeat",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }
    : {
        backgroundColor: "#f1f5f9",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      };

  return (
    <div key={selectedJobId || "default"} className="h-screen w-screen relative overflow-hidden" style={backgroundStyle}>
      <div className="absolute top-0 left-0 right-0 h-20 bg-white z-50" />

      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {started && canNextInterviewer && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextInterviewer}
            className="bg-white/90 backdrop-blur"
            aria-label="다음 면접관"
          >
            <UserCircle className="h-4 w-4 mr-1" />
            다음 면접관
          </Button>
        )}
        <Button
          aria-label={interviewVoiceEnabled ? "음성 끄기" : "음성 켜기"}
          variant="outline"
          size="sm"
          onClick={() => setInterviewVoiceEnabled(!interviewVoiceEnabled)}
          className="bg-white/90 backdrop-blur"
        >
          {interviewVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">{interviewVoiceEnabled ? "음성 ON" : "음성 OFF"}</span>
        </Button>
      </div>

      {interviewVoiceEnabled && (ttsState.isSpeaking || ttsState.queueLength > 0) && (
        <div className="absolute top-16 right-4 z-50 bg-white/90 backdrop-blur rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-blue-600 animate-pulse" />
          <span className="text-sm text-slate-700">
            {ttsState.isSpeaking ? "🔊 재생 중..." : `대기 중 (${ttsState.queueLength})`}
          </span>
        </div>
      )}

      {/* 웹캠 PIP: 면접관 이미지 오른쪽 아래 작은 오버레이 (입력창 위로 배치) */}
      <div 
        className="fixed right-4 z-50 w-[180px] h-[135px] sm:w-[220px] sm:h-[165px] md:w-[260px] md:h-[195px] rounded-[14px] border border-black/10 shadow-lg overflow-hidden bg-white"
        style={{ 
          bottom: started && inputBarHeight > 0 
            ? inputBarHeight + 16 
            : 16 
        }}
      >
        {/* 카메라 토글 버튼: PIP 내부 상단 우측 오버레이 */}
        <div className="absolute top-2 right-2 z-30 flex gap-1">
          <Button
            onClick={handleCameraToggle}
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs bg-white/85 backdrop-blur border border-gray-300 shadow-sm hover:bg-white"
            aria-label={camOn ? "카메라 끄기" : "카메라 켜기"}
          >
            {camOn ? (
              <>
                <VideoOff className="h-3 w-3 mr-1" />
                <span>끄기</span>
              </>
            ) : (
              <>
                <Video className="h-3 w-3 mr-1" />
                <span>켜기</span>
              </>
            )}
          </Button>
          {camOn && (
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant="outline"
              size="sm"
              className={`h-8 px-2 text-xs bg-white/85 backdrop-blur border shadow-sm ${
                isRecording
                  ? "bg-red-500/90 text-white border-red-600 hover:bg-red-600"
                  : "border-gray-300 hover:bg-white"
              }`}
              aria-label={isRecording ? "녹화 중지" : "녹화 시작"}
            >
              {isRecording ? (
                <>
                  <Circle className="h-3 w-3 mr-1 fill-current" />
                  <span>녹화중</span>
                </>
              ) : (
                <>
                  <Circle className="h-3 w-3 mr-1" />
                  <span>녹화</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* 웹캠 영상: 항상 렌더링하되 camOn일 때만 표시 */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${camOn && !camError ? "block" : "hidden"}`}
          style={{ transform: "scaleX(-1)" }}
          onLoadedMetadata={() => {
            console.log("[Camera] Video metadata loaded");
            if (videoRef.current) {
              videoRef.current.play().catch(console.error);
            }
          }}
          onCanPlay={() => {
            console.log("[Camera] Video can play");
          }}
          onError={(e) => {
            console.error("[Camera] Video error:", e);
            setCamError("영상 재생 중 오류가 발생했어요");
          }}
        />
        
        {/* 에러 상태 */}
        {camError && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600 p-2">
            <VideoOff className="h-8 w-8 mb-1 text-gray-400" />
            <p className="text-xs text-center leading-tight">{camError}</p>
          </div>
        )}
        
        {/* 꺼져있음 플레이스홀더 */}
        {!camOn && !camError && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600 p-2">
            <Video className="h-8 w-8 mb-1 text-gray-400" />
            <p className="text-xs text-center leading-tight">카메라 꺼짐</p>
            <p className="text-[10px] text-center mt-0.5 text-gray-400">버튼을 눌러 켜기</p>
          </div>
        )}
      </div>

      <div className="relative z-10 pt-8 pb-24">
        <div className="mx-auto max-w-4xl px-4">
          {!interviewerImage && (
            <div className="flex justify-center items-center min-h-[200px] text-slate-500 text-sm">
              이미지 없음
            </div>
          )}
          {!started ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <Button
                onClick={startInterview}
                aria-label="면접 시작"
                className="bg-white text-black hover:bg-gray-100 text-3xl px-12 py-6 rounded-xl shadow-2xl border-4 border-gray-400 font-bold"
                size="lg"
                style={{ filter: "none", opacity: 1, zIndex: 100 }}
              >
                면접 시작
              </Button>
            </div>
          ) : (
            <>
              {currentInterviewerMessage && (
                <div className="flex justify-center mb-8 px-4" style={{ marginTop: "100px" }}>
                  <div className="bg-slate-100 rounded-2xl px-6 py-4 shadow-[0_12px_24px_rgba(0,0,0,0.08)] max-w-[800px] w-full mx-auto animate-fadeIn">
                    <p className="text-xl leading-relaxed text-slate-800 whitespace-pre-wrap">{displayInterviewerText}</p>
                  </div>
                </div>
              )}
              {loading && !currentInterviewerMessage && (
                <div className="flex justify-center mb-8 px-4" style={{ marginTop: "100px" }}>
                  <div className="bg-white/90 backdrop-blur rounded-2xl px-6 py-4 shadow-lg">
                    <p className="text-xl leading-relaxed text-slate-800">면접관이 질문을 준비하고 있습니다...</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {started && currentUserMessage && (
        <div className="fixed inset-x-0 flex justify-center px-6 z-40" style={{ bottom: "160px" }}>
          <div className="bg-[#377cfb] text-white rounded-t-2xl rounded-b-xl px-6 py-4 shadow-[0_8px_20px_rgba(0,0,0,0.12)] w-full max-w-[800px] mx-auto animate-fadeIn">
            <p className="text-xl leading-relaxed whitespace-pre-wrap">{displayUserText}</p>
          </div>
        </div>
      )}

      {/* 면접 종료 CTA 오버레이 */}
      {showResultCTA && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
            <h2 className="text-2xl font-bold mb-4 text-center text-slate-900">면접이 종료되었습니다</h2>
            <p className="text-slate-600 text-center mb-6">수고하셨습니다. 면접 결과를 확인해보세요.</p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={async () => {
                  setShowResultCTA(false);
                  
                  // 녹화 중이면 자동 종료
                  if (isRecording) {
                    console.log("[Result] Stopping recording before showing result...");
                    await stopRecording();
                  }
                  
                  // 결과 모달 열기 전에 messages에서 평가 메시지 재추출
                  const evaluationText = extractFinalEvaluation(messages);
                  if (evaluationText && !finalEvaluationText) {
                    setFinalEvaluationText(evaluationText);
                  }
                  setShowResultModal(true);
                  
                  // 추가 피드백 생성 (비동기)
                  if (evaluationText || finalEvaluationText) {
                    setTimeout(() => generateExtraFeedback(), 500);
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg py-6"
                size="lg"
              >
                면접 결과 보기
              </Button>
              <Button
                onClick={() => setShowResultCTA(false)}
                variant="outline"
                className="text-slate-600"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 결과 모달 */}
      {showResultModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-slate-900">면접 결과</h2>
              <Button
                onClick={() => setShowResultModal(false)}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* PDF 생성용 영역 (화면 밖에 배치하되 렌더링은 유지) */}
            <div ref={pdfRef} style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm", backgroundColor: "white", padding: "20px" }}>
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: "16px", lineHeight: "1.6" }}>
                <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "24px", textAlign: "center", color: "#1e293b" }}>
                  면접 결과
                </h1>
                
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px", color: "#334155" }}>면접관 평가</h2>
                  <div style={{ padding: "16px", backgroundColor: "#f8f9fa", border: "1px solid #dee2e6", borderRadius: "8px" }}>
                    <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: "1.7", fontSize: "15px", color: "#1e293b", margin: 0 }}>
                      {finalEvaluationText || extractFinalEvaluation(messages) || "평가 문구를 찾지 못했습니다."}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px", color: "#334155" }}>대화 내역</h2>
                  <div style={{ padding: "16px", backgroundColor: "#f8f9fa", border: "1px solid #dee2e6", borderRadius: "8px" }}>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          marginBottom: "12px",
                          padding: "12px",
                          backgroundColor: msg.role === "assistant" ? "#e7f3ff" : "#f0e7ff",
                          borderRadius: "6px",
                        }}
                      >
                        <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#475569", opacity: 0.9 }}>
                          {msg.role === "assistant" ? "면접관" : "나"}
                        </div>
                        <p style={{ fontSize: "15px", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: "1.7", margin: 0, color: "#1e293b" }}>
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {learnedText && (
                  <div style={{ marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px", color: "#334155" }}>오늘 배운 점</h2>
                    <div style={{ padding: "16px", backgroundColor: "#f8f9fa", border: "1px solid #dee2e6", borderRadius: "8px" }}>
                      <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: "1.7", fontSize: "15px", color: "#1e293b", margin: 0 }}>
                        {learnedText}
                      </p>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: "24px", fontSize: "13px", color: "#64748b", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                  생성일시: {new Date().toLocaleString("ko-KR")}
                </div>
              </div>
            </div>

            {/* 화면에 표시되는 영역 */}
            {(() => {
              // finalEvaluationText가 없으면 messages에서 다시 추출 시도
              const displayEvaluationText = finalEvaluationText || extractFinalEvaluation(messages);
              
              return displayEvaluationText ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-3 text-slate-800">면접관 평가 (원문)</h3>
                    <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                      <p className="text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                        {displayEvaluationText}
                      </p>
                    </div>
                  </div>
                  
                  {/* 추가 피드백 섹션 */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-3 text-slate-800">추가 피드백</h3>
                    {isLoadingFeedback ? (
                      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                        <p className="text-slate-500 text-center py-4">
                          피드백 만드는 중...
                        </p>
                      </div>
                    ) : extraFeedbackText ? (
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <div 
                          className="text-slate-800 whitespace-pre-wrap break-words leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: extraFeedbackText
                              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br />')
                          }}
                        />
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                        <p className="text-slate-500 text-center py-4">
                          추가 피드백을 불러오지 못했어. 원문 평가를 참고해줘.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-3 text-slate-800">면접관 평가</h3>
                  <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                    <p className="text-slate-500 text-center py-4">
                      평가 문구를 찾지 못했습니다. 면접을 완료한 뒤 다시 시도해주세요.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 녹화된 영상 섹션 */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3 text-slate-800">녹화된 영상</h3>
              {isRecording ? (
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <p className="text-slate-500 text-center py-4">
                    녹화를 마무리 중...
                  </p>
                </div>
              ) : recordingUrl ? (
                <div>
                  <video
                    controls
                    playsInline
                    src={recordingUrl}
                    className="w-full max-w-[720px] rounded-xl border border-slate-300"
                  />
                  <p className="text-sm text-slate-500 mt-2 italic">
                    ※ 녹화된 영상은 이 화면에서만 일시적으로 재생되며, 서버에 저장되지 않습니다.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <p className="text-slate-500 text-center py-4">
                    녹화된 영상이 없습니다. 면접 중 '녹화 시작'을 눌러주세요.
                  </p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3 text-slate-800">대화 내역</h3>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-60 overflow-y-auto">
                <div className="space-y-3">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.role === "assistant"
                          ? "bg-blue-50 text-blue-900"
                          : "bg-indigo-50 text-indigo-900 ml-8"
                      }`}
                    >
                      <div className="text-xs font-semibold mb-1 opacity-70">
                        {msg.role === "assistant" ? "면접관" : "나"}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 오늘 배운 점 섹션 */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3 text-slate-800">오늘 배운 점</h3>
              <div className="relative">
                <Textarea
                  value={learnedText}
                  onChange={(e) => setLearnedText(e.target.value)}
                  placeholder="오늘 면접에서 배운 점을 적어보세요."
                  className="min-h-[120px] pr-20"
                  rows={5}
                />
                <Button
                  onClick={handleLearnedVoiceToggle}
                  disabled={!speechSupported}
                  className={`absolute right-2 bottom-2 ${
                    isListeningLearned
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-purple-200 hover:bg-purple-300 text-purple-700"
                  }`}
                  size="sm"
                  aria-label={isListeningLearned ? "음성 입력 중지" : "음성 입력 시작"}
                >
                  {isListeningLearned ? (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      듣는 중...
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-1" />
                      음성 입력
                    </>
                  )}
                </Button>
              </div>
              {!speechSupported && (
                <p className="text-xs text-slate-500 mt-2">
                  이 브라우저에서는 음성 입력을 지원하지 않습니다.
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowResultModal(false);
                  setShowResultCTA(false);
                  setIsInterviewEnded(false);
                  setStarted(false);
                  setMessages([]);
                  setCurrentInterviewerMessage("");
                  setCurrentUserMessage("");
                  setDisplayInterviewerText("");
                  setDisplayUserText("");
                  setLearnedText("");
                  if (recordingUrl) {
                    URL.revokeObjectURL(recordingUrl);
                    setRecordingUrl(null);
                  }
                }}
                variant="outline"
              >
                다시 면접하기
              </Button>
              <Button
                onClick={handleExportPDF}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                결과 저장 (PDF)
              </Button>
            </div>
          </div>
        </div>
      )}

      {started && (
        <div 
          ref={inputBarRef}
          className="fixed inset-x-0 bottom-0 bg-white p-4 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
        >
          <div className="mx-auto max-w-4xl">
            <div className="relative">
              <Textarea
                value={userDraftAnswer}
                onChange={(e) => setUserDraftAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="방금 한 말을 확인하고 수정하세요..."
                className="min-h-[100px] max-h-40 resize-none pr-28 pl-20 bg-gray-100 border-2 border-gray-300 rounded-xl shadow-lg text-xl placeholder:text-xl focus:border-blue-500 focus:bg-white"
                rows={3}
              />
              <Button
                onClick={handleRecognizeToggle}
                className={`absolute left-2 top-2 h-16 w-16 rounded-full ${
                  listening ? "bg-red-500 text-white hover:bg-red-600" : "bg-purple-200 text-purple-700 hover:bg-purple-300"
                }`}
                aria-pressed={listening}
                aria-label={listening ? "음성 입력 중지" : "음성 입력 시작"}
              >
                {listening ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </Button>
              {/* 빠른 응답 버튼 - 입력창 오른쪽 구석 */}
              <Button
                onClick={() => {
                  if (!loading) {
                    sendMessage("잘 모르겠습니다.");
                  }
                }}
                disabled={loading}
                variant="outline"
                size="sm"
                className="absolute right-2 top-2 text-xs px-2 py-1 h-auto"
              >
                잘 모르겠습니다.
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!userDraftAnswer.trim() || loading}
                size="icon"
                className="absolute right-2 bottom-2 h-12 w-12 bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
                aria-label="답변 전송"
              >
                <Send className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
