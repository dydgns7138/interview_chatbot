"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Send, Square, Volume2, VolumeX } from "lucide-react";
import { createRecognition, getSpeechSupport, speak, stopSpeaking } from "@/lib/voice";
import { useVoice } from "@/lib/state/voice-context";
import { getSelectedJob } from "@/lib/state/profile";
import { ttsPlayer } from "./ttsPlayer";

// 직무별 면접관 이미지 매핑
const interviewImageMap: Record<string, string> = {
  "office-support": "/images/man_interviewer.png",
  "assembly-packaging": "/images/interviewer_manufacture.png",
  "customer-service": "/images/interviewer_service.png",
  "environment-cleaning": "/images/interviewer_cleaning.png",
  "care-support": "/images/interviewer_support.png",
  "logistics": "/images/interviewer_trainsportation.png",
};

// 직무별 이미지 포커스 위치 (얼굴이 위쪽에 보이도록 조정)
const imagePositionMap: Record<string, string> = {
  "care-support": "center 20%",
  "customer-service": "center 25%",
  "assembly-packaging": "center 20%",
  // 나머지 직무는 기본값 사용
};

// 직무 ID에 해당하는 이미지 경로를 반환 (fallback: office-support)
function getInterviewerImage(jobId: string | null): string {
  if (!jobId) {
    return interviewImageMap["office-support"]!;
  }
  return interviewImageMap[jobId] ?? interviewImageMap["office-support"]!;
}

// 직무 ID에 해당하는 이미지 포커스 위치를 반환
function getImagePosition(jobId: string | null): string {
  if (!jobId) {
    return "center 150px";
  }
  return imagePositionMap[jobId] ?? "center 150px";
}

export default function ChatPage() {
  const [started, setStarted] = React.useState(false);
  const [userDraftAnswer, setUserDraftAnswer] = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  
  // 대화 히스토리 관리 (OpenAI messages 형식)
  const [messages, setMessages] = React.useState<Array<{ role: "system" | "user" | "assistant"; content: string }>>([]);
  
  // Live interview state - only current messages
  const [currentInterviewerMessage, setCurrentInterviewerMessage] = React.useState("");
  const [currentUserMessage, setCurrentUserMessage] = React.useState("");
  
  // Display states for typing animation
  const [displayInterviewerText, setDisplayInterviewerText] = React.useState("");
  const [displayUserText, setDisplayUserText] = React.useState("");
  
  // Selected job info
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  
  const support = getSpeechSupport();
  const { screenReaderEnabled, interviewVoiceEnabled, setInterviewVoiceEnabled } = useVoice();
  const typingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const userTypingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const hasReadGuideRef = React.useRef<boolean>(false);
  
  // TTS 플레이어 상태
  const [ttsState, setTtsState] = React.useState(ttsPlayer.getState());

  // 화면설명 안내 문구
  const guideText = "면접 시작 버튼을 누르시면 면접관과의 대화가 실행됩니다.";

  // 화면설명 안내 문구 읽기 (면접 탭 진입 시 또는 화면설명 ON으로 전환 시)
  React.useEffect(() => {
    if (screenReaderEnabled && !hasReadGuideRef.current) {
      stopSpeaking();
      speak(guideText, { lang: "ko-KR" });
      hasReadGuideRef.current = true;
    }
    return () => {
      if (!screenReaderEnabled) {
        hasReadGuideRef.current = false;
      }
    };
  }, [screenReaderEnabled]);

  // 컴포넌트 언마운트 시 리셋
  React.useEffect(() => {
    return () => {
      hasReadGuideRef.current = false;
      stopSpeaking();
    };
  }, []);

  // Load selected job info
  React.useEffect(() => {
    async function loadSelectedJob() {
      const jobId = await getSelectedJob();
      console.log('[ChatPage] Loaded jobId:', jobId);
      setSelectedJobId(jobId);
    }
    loadSelectedJob();
  }, []);

  // TTS 플레이어 상태 구독
  React.useEffect(() => {
    const unsubscribe = ttsPlayer.subscribe(() => {
      setTtsState(ttsPlayer.getState());
    });
    return unsubscribe;
  }, []);

  // 컴포넌트 언마운트 시 TTS 정리
  React.useEffect(() => {
    return () => {
      ttsPlayer.stop();
    };
  }, []);



  // Cleanup intervals on unmount
  React.useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      if (userTypingIntervalRef.current) {
        clearInterval(userTypingIntervalRef.current);
      }
    };
  }, []);


  // Typing animation helper
  const animateText = (fullText: string, setFn: (text: string) => void, speed = 30) => {
    setFn("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setFn(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(interval);
    }, speed);
  };

  // Show interviewer message with typing animation
  const showInterviewerMessage = (fullText: string) => {
    setCurrentInterviewerMessage(fullText);
    animateText(fullText, setDisplayInterviewerText);
  };

  // Show user message with typing animation
  const showUserMessage = (fullText: string) => {
    setCurrentUserMessage(fullText);
    animateText(fullText, setDisplayUserText);
  };

  async function startInterview() {
    setStarted(true);
    const initialMessage = "안녕하세요. 면접 시작하겠습니다. 준비되셨다면 자기소개 부탁드립니다.";
    
    // Clear any previous messages and show only current interviewer message
    setCurrentUserMessage("");
    setCurrentInterviewerMessage("");
    
    // messages 히스토리 초기화 및 첫 assistant 메시지 추가 (웰컴메시지)
    setMessages([
      { role: "assistant", content: initialMessage }
    ]);
    
    // Show message immediately and TTS
    showInterviewerMessage(initialMessage);
    playInterviewTTS(initialMessage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return; // request de-duplication: 이미 요청 중이면 무시
    
    // Clear previous user message only when starting new response
    setCurrentUserMessage("");
    
    // Show user's current response immediately
    showUserMessage(text);
    
    // Clear input but keep user message visible
    setUserDraftAnswer("");
    
    // Set loading state (request de-duplication)
    setLoading(true);

    // messages 히스토리에 user 메시지 추가
    const userMessage = { role: "user" as const, content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // 로깅: 요청 전 메시지 히스토리 확인
    console.log("[ChatPage] Sending message, history length:", updatedMessages.length);
    if (updatedMessages.length >= 2) {
      const lastTwo = updatedMessages.slice(-2);
      console.log("[ChatPage] Last 2 messages:", lastTwo.map(m => ({ role: m.role, contentLength: m.content.length })));
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: updatedMessages,
          jobId: selectedJobId 
        }),
      });
      
      if (!res.ok) {
        throw new Error("API 요청 실패");
      }
      
      if (!res.body) {
        throw new Error("응답을 받을 수 없습니다");
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8", { fatal: false });
      let assistant = "";
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        // UTF-8 안전 디코딩 (멀티바이트 문자 보호)
        const chunk = decoder.decode(value, { stream: true });
        assistant += chunk;
      }
      
      // 최종 디코딩 완료 (남은 버퍼 처리)
      const finalChunk = decoder.decode();
      if (finalChunk) {
        assistant += finalChunk;
      }
      
      // 화면 표시용 텍스트 (원본 그대로 사용)
      const displayText = assistant.trim();
      // TTS용 텍스트 (화면과 동일, 필요시 별도 전처리 가능)
      const ttsText = displayText;
      
      // 동일 응답 반복 방지: 마지막 assistant 메시지와 동일하면 재생성 요청
      const lastAssistantMessage = updatedMessages.filter(m => m.role === "assistant").pop();
      if (lastAssistantMessage && lastAssistantMessage.content === displayText) {
        console.warn("[ChatPage] Duplicate response detected, forcing regeneration");
        // 에러 메시지 대신 다른 질문 요청
        const fallbackMessage = "죄송합니다. 다른 질문을 드리겠습니다. 지원 동기가 어떻게 되시나요?";
        const assistantMessage = { role: "assistant" as const, content: fallbackMessage };
        setMessages([...updatedMessages, assistantMessage]);
        showInterviewerMessage(fallbackMessage);
        playInterviewTTS(fallbackMessage);
        setLoading(false);
        return;
      }
      
      // 디버깅: API 응답 확인 (프로덕션에서도 길이 확인 가능)
      console.log("[ChatPage] API Response received, length:", displayText.length);
      console.log("[ChatPage] Messages history length before append:", updatedMessages.length);
      if (process.env.NODE_ENV !== "production") {
        console.log("[ChatPage] API Response preview:", displayText.substring(0, 150) + (displayText.length > 150 ? "..." : ""));
      }
      
      // messages 히스토리에 assistant 응답 추가
      const assistantMessage = { role: "assistant" as const, content: displayText };
      setMessages([...updatedMessages, assistantMessage]);
      
      // Show new interviewer message immediately (화면 표시용 - 원본 텍스트)
      showInterviewerMessage(displayText);
      // TTS 재생 (별도 텍스트 사용)
      playInterviewTTS(ttsText);
      
    } catch (e) {
      console.error("Send message error:", e);
      const errorMessage = "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      showInterviewerMessage(errorMessage);
      playInterviewTTS(errorMessage);
      // 에러 발생 시 messages 히스토리에서 마지막 user 메시지 제거 (롤백)
      setMessages(messages);
    } finally {
      // CRITICAL: Always re-enable input
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
      // 최종 인식만 입력창에 반영하여 중복 누적을 막는다
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res.isFinal) continue;
        const transcript = res[0].transcript.trim();
        if (transcript) {
          setUserDraftAnswer((prev) => (prev ? prev + " " : "") + transcript);
        }
      }
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  }

  function handleSubmit() {
    if (!userDraftAnswer.trim() || loading) return; // request de-duplication
    sendMessage(userDraftAnswer);
  }

  // Handle key down events for text input (request de-duplication)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (userDraftAnswer.trim() && !loading) { // request de-duplication
        sendMessage(userDraftAnswer.trim());
      }
    }
  };

  // Interviewer TTS function (OpenAI TTS 사용)
  function playInterviewTTS(messageText: string) {
    if (interviewVoiceEnabled) {
      ttsPlayer.enqueue(messageText, selectedJobId);
    }
  }

  // 선택된 직무에 따른 면접관 이미지 경로 및 포커스 위치
  const interviewerImage = getInterviewerImage(selectedJobId);
  const imagePosition = getImagePosition(selectedJobId);
  
  // 디버깅: jobId와 이미지 경로 로그
  React.useEffect(() => {
    console.log('[ChatPage] selectedJobId:', selectedJobId, '-> image:', interviewerImage, '-> position:', imagePosition);
  }, [selectedJobId, interviewerImage, imagePosition]);

  return (
    <div 
      key={selectedJobId || 'default'} // jobId 변경 시 강제 리렌더링
      className="h-screen w-screen relative overflow-hidden"
      style={{
        backgroundImage: `url("${interviewerImage}")`,
        backgroundSize: 'contain',
        backgroundPosition: imagePosition,
        backgroundRepeat: 'no-repeat',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      {/* Top white overlay to prevent menu overlap */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-white z-50"></div>
      
      {/* 면접 음성 토글 버튼 */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
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

      {/* TTS 상태 표시 */}
      {interviewVoiceEnabled && (ttsState.isSpeaking || ttsState.queueLength > 0) && (
        <div className="absolute top-16 right-4 z-50 bg-white/90 backdrop-blur rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-blue-600 animate-pulse" />
          <span className="text-sm text-slate-700">
            {ttsState.isSpeaking ? "🔊 재생 중..." : `대기 중 (${ttsState.queueLength})`}
          </span>
        </div>
      )}
      
      {/* Interviewer area - fixed at top */}
      <div className="relative z-10 pt-8 pb-24">
        <div className="mx-auto max-w-4xl px-4">
          {!started ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <Button 
                onClick={startInterview} 
                aria-label="면접 시작"
                className="bg-white text-black hover:bg-gray-100 text-3xl px-12 py-6 rounded-xl shadow-2xl border-4 border-gray-400 font-bold"
                size="lg"
                style={{
                  filter: 'none',
                  opacity: 1,
                  zIndex: 100
                }}
              >
                면접 시작
              </Button>
            </div>
          ) : (
            <>
              {/* Current interviewer message - floating speech bubble */}
              {currentInterviewerMessage && (
                <div className="flex justify-center mb-8 px-4" style={{marginTop: '100px'}}>
                  <div className="bg-slate-100 rounded-2xl px-6 py-4 shadow-[0_12px_24px_rgba(0,0,0,0.08)] max-w-[800px] w-full mx-auto animate-fadeIn">
                    <p className="text-xl leading-relaxed text-slate-800 whitespace-pre-wrap">
                      {displayInterviewerText}
                    </p>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {loading && !currentInterviewerMessage && (
                <div className="flex justify-center mb-8 px-4" style={{marginTop: '100px'}}>
                  <div className="bg-white/90 backdrop-blur rounded-2xl px-6 py-4 shadow-lg">
                    <p className="text-xl leading-relaxed text-slate-800">
                      면접관이 질문을 준비하고 있습니다...
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Current user response - blue bubble positioned above input bar */}
      {started && currentUserMessage && (
        <div
          className="
            fixed
            inset-x-0
            flex
            justify-center
            px-6
            z-40
          "
          style={{
            bottom: "160px", // adjusted to be just above input with small margin
          }}
        >
          <div className="
            bg-[#377cfb]
            text-white
            rounded-t-2xl
            rounded-b-xl
            px-6
            py-4
            shadow-[0_8px_20px_rgba(0,0,0,0.12)]
            w-full
            max-w-[800px]
            mx-auto
            animate-fadeIn
          ">
            <p className="text-xl leading-relaxed whitespace-pre-wrap">
              {displayUserText}
            </p>
          </div>
        </div>
      )}



      {/* Bottom fixed user input area */}
      {started && (
        <div className="fixed inset-x-0 bottom-0 bg-white p-4 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="mx-auto max-w-4xl">
            
            {/* Answer input area with microphone button inside */}
            <div className="relative">
              <Textarea
                value={userDraftAnswer}
                onChange={(e) => setUserDraftAnswer(e.target.value)}
                placeholder="방금 한 말을 확인하고 수정하세요..."
                className="min-h-[100px] max-h-40 resize-none pr-28 pl-20 bg-gray-100 border-2 border-gray-300 rounded-xl shadow-lg text-xl placeholder:text-xl focus:border-blue-500 focus:bg-white"
                rows={3}
              />
              
              {/* Microphone button inside textarea */}
              <Button
                onClick={handleRecognizeToggle}
                className={`absolute left-2 top-2 h-16 w-16 rounded-full ${
                  listening 
                    ? "bg-red-500 text-white hover:bg-red-600" 
                    : "bg-purple-200 text-purple-700 hover:bg-purple-300"
                }`}
                aria-pressed={listening}
                aria-label={listening ? "음성 입력 중지" : "음성 입력 시작"}
              >
                {listening ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </Button>
              
              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={!userDraftAnswer.trim()}
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


