// 브라우저 음성 유틸리티
// - STT/TTS 기능 지원 여부 감지
// - Web Speech API 인식기 생성 팩토리
// - 음성 합성 실행/중지 헬퍼

// Web Speech API 타입 정의
interface SpeechRecognition extends EventTarget {
  start(): void;
  stop(): void;
  abort(): void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

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

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export type SpeechSupport = {
  sttSupported: boolean;
  ttsSupported: boolean;
};

export function getSpeechSupport(): SpeechSupport {
  const sttSupported = typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const ttsSupported = typeof window !== "undefined" && !!window.speechSynthesis;
  return { sttSupported: !!sttSupported, ttsSupported };
}

export function createRecognition(lang = "ko-KR") {
  const Rec: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Rec) return null;
  const recognition = new Rec();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = true;
  return recognition as SpeechRecognition;
}

export function speak(text: string, options?: { lang?: string; rate?: number; pitch?: number; volume?: number }) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = options?.lang ?? "ko-KR";
  utter.rate = options?.rate ?? 1;
  utter.pitch = options?.pitch ?? 1;
  utter.volume = options?.volume ?? 1;
  const voices = window.speechSynthesis.getVoices();
  const koVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("ko"));
  if (koVoice) utter.voice = koVoice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}


