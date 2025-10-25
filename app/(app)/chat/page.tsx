"use client";
import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Send, Square } from "lucide-react";
import { createRecognition, getSpeechSupport, speak, stopSpeaking } from "@/lib/voice";
import { useVoice } from "@/lib/state/voice-context";
import { getSelectedJob } from "@/lib/state/profile";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [started, setStarted] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [userDraftAnswer, setUserDraftAnswer] = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  
  // 면접관 발화 상태
  const [currentBotUtteranceFull, setCurrentBotUtteranceFull] = React.useState("");
  const [currentBotUtteranceVisible, setCurrentBotUtteranceVisible] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  
  // 사용자 응답 타이핑 효과 상태
  const [currentUserResponseFull, setCurrentUserResponseFull] = React.useState("");
  const [currentUserResponseVisible, setCurrentUserResponseVisible] = React.useState("");
  const [isUserTyping, setIsUserTyping] = React.useState(false);
  
  // 선택된 직무 정보
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  
  const support = getSpeechSupport();
  const { ttsEnabled } = useVoice();
  const endRef = React.useRef<HTMLDivElement | null>(null);
  const typingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const userTypingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // 선택된 직무 정보 로드
  React.useEffect(() => {
    async function loadSelectedJob() {
      const jobId = await getSelectedJob();
      setSelectedJobId(jobId);
    }
    loadSelectedJob();
  }, []);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, currentBotUtteranceVisible, currentUserResponseVisible]);

  // 면접관 타이핑 효과 구현
  const startTypingEffect = (fullText: string) => {
    setCurrentBotUtteranceFull(fullText);
    setCurrentBotUtteranceVisible("");
    setIsTyping(true);
    
    let currentIndex = 0;
    const typingSpeed = 50; // ms per character
    
    typingIntervalRef.current = setInterval(() => {
      if (currentIndex < fullText.length) {
        setCurrentBotUtteranceVisible(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }
    }, typingSpeed);
  };

  // 사용자 응답 타이핑 효과 구현
  const startUserTypingEffect = (fullText: string) => {
    setCurrentUserResponseFull(fullText);
    setCurrentUserResponseVisible("");
    setIsUserTyping(true);
    
    let currentIndex = 0;
    const typingSpeed = 30; // ms per character (사용자 응답은 조금 더 빠르게)
    
    userTypingIntervalRef.current = setInterval(() => {
      if (currentIndex < fullText.length) {
        setCurrentUserResponseVisible(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsUserTyping(false);
        if (userTypingIntervalRef.current) {
          clearInterval(userTypingIntervalRef.current);
          userTypingIntervalRef.current = null;
        }
        // 타이핑 완료 후 자동 숨김 제거 - 다음 면접관 질문까지 계속 표시
      }
    }, typingSpeed);
  };

  // 컴포넌트 언마운트 시 타이핑 인터벌 정리
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

  async function startInterview() {
    setStarted(true);
    const initialMessage = "안녕하세요! 면접 연습을 시작해볼까요? 준비되셨다면 소개를 부탁드립니다.";
    setMessages([{ role: "assistant", content: initialMessage }]);
    
    // 타이핑 효과와 TTS 동시 시작
    startTypingEffect(initialMessage);
    playInterviewTTS(initialMessage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    
    // 사용자 응답 타이핑 효과 시작
    startUserTypingEffect(text);
    
    // 입력창 비우기
    setUserDraftAnswer("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text,
          jobId: selectedJobId 
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error("요청 실패");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistant += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant" && last.content.endsWith("…")) {
            copy[copy.length - 1] = { role: "assistant", content: assistant + "…" };
          } else {
            copy.push({ role: "assistant", content: assistant + "…" });
          }
          return copy;
        });
      }
      
      // 최종 응답 완성 시 타이핑 효과와 TTS 시작
      const finalResponse = assistant;
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = { role: "assistant", content: finalResponse };
        }
        return copy;
      });
      
      // 사용자 응답 숨기기 (새로운 면접관 질문이 올 때)
      setCurrentUserResponseVisible("");
      setCurrentUserResponseFull("");
      
      // 타이핑 효과와 TTS 동시 시작
      startTypingEffect(finalResponse);
      playInterviewTTS(finalResponse);
      
    } catch (e) {
      const errorMessage = "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      setMessages((m) => [...m, { role: "assistant", content: errorMessage }]);
      
      // 사용자 응답 숨기기 (에러 메시지 표시 시)
      setCurrentUserResponseVisible("");
      setCurrentUserResponseFull("");
      
      startTypingEffect(errorMessage);
      playInterviewTTS(errorMessage);
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
    if (!userDraftAnswer.trim()) return;
    sendMessage(userDraftAnswer);
  }

  // 면접관 TTS 재생 함수
  function playInterviewTTS(messageText: string) {
    if (ttsEnabled && support.ttsSupported) {
      speak(messageText);
    }
  }

  return (
    <div 
      className="h-screen w-screen relative overflow-hidden"
      style={{
        backgroundImage: 'url("/images/man_interviewer.png")',
        backgroundSize: 'contain',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      {/* 화면 상단 하얀색 오버레이 - 메뉴와 이미지 겹침 방지 */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-white z-50"></div>
      
      {/* 면접관 영역 - 상단 고정 */}
      <div className="relative z-10 pt-8 pb-24">
        <div className="mx-auto max-w-4xl px-4">
          {!started ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-3">
                  <Image
                    src="/interviewer.svg"
                    alt="면접관"
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full ring-2 ring-white/50 flex-shrink-0"
                  />
                  <div className="bg-white/90 backdrop-blur rounded-2xl px-4 py-3 shadow-lg max-w-[70%]">
                    <p className="text-xl leading-relaxed text-slate-800">면접을 시작할 준비가 되면 아래 버튼을 눌러주세요.</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <Button onClick={startInterview} aria-label="면접 시작">면접 시작</Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 면접관 현재 발화 영역 - 항상 표시 */}
              <div className="flex justify-center mb-8 px-4" style={{marginTop: '100px'}}>
                <div className="bg-white/90 backdrop-blur rounded-2xl px-6 py-4 shadow-lg max-w-[90%]">
                  <p className="text-xl leading-relaxed text-slate-800 whitespace-pre-wrap">
                    {currentBotUtteranceVisible || (loading && "면접관이 질문을 준비하고 있습니다...")}
                    {isTyping && <span className="inline-block w-2 h-4 bg-slate-400 animate-blink ml-1">▋</span>}
                  </p>
                </div>
              </div>

              <div ref={endRef} />
            </>
          )}
        </div>
      </div>

      {/* 사용자 응답 - 면접관 이미지 위에 오버레이로 표시 (자막 효과) */}
      {started && currentUserResponseVisible && (
        <div className="absolute inset-0 flex items-end justify-center z-30" style={{paddingBottom: '580px'}}>
          <div className="flex justify-center">
            <div className="bg-blue-500 text-white rounded-2xl px-6 py-4 shadow-lg max-w-[80%]">
              <p className="text-xl leading-relaxed whitespace-pre-wrap">
                {currentUserResponseVisible}
                {isUserTyping && <span className="inline-block w-2 h-4 bg-white animate-blink ml-1">▋</span>}
              </p>
            </div>
          </div>
        </div>
      )}


      {/* 하단 고정 사용자 입력 영역 */}
      {started && (
        <div className="fixed inset-x-0 bottom-0 bg-white p-4">
          <div className="mx-auto max-w-4xl">
            {/* 마이크 버튼 - 텍스트 박스 위쪽에 분리 배치 */}
            <div className="flex justify-center mb-3">
              <Button
                onClick={handleRecognizeToggle}
                className={`h-20 w-20 rounded-full text-3xl ${
                  listening 
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-xl" 
                    : "bg-purple-200 text-purple-700 hover:bg-purple-300 shadow-xl"
                }`}
                aria-pressed={listening}
                aria-label={listening ? "음성 입력 중지" : "음성 입력 시작"}
              >
                {listening ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </Button>
            </div>
            
            {/* 답변 입력 영역 - 높이 증가 */}
            <div className="relative">
              <Textarea
                value={userDraftAnswer}
                onChange={(e) => setUserDraftAnswer(e.target.value)}
                placeholder="방금 한 말을 확인하고 수정하세요..."
                className="min-h-[100px] max-h-40 resize-none pr-12 bg-gray-100 border-2 border-gray-300 rounded-xl shadow-lg text-xl placeholder:text-xl focus:border-blue-500 focus:bg-white"
                rows={3}
              />
              
              {/* 제출 버튼 */}
              <Button
                onClick={handleSubmit}
                disabled={!userDraftAnswer.trim()}
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8 bg-blue-500 hover:bg-blue-600"
                aria-label="답변 전송"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


