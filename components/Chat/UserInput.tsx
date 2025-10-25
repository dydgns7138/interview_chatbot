"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Square, Send } from "lucide-react";

// Web Speech API 타입 정의
interface SpeechRecognition extends EventTarget {
  start(): void;
  stop(): void;
  abort(): void;
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

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: (v: string) => void;
  createRecognition?: () => SpeechRecognition | null;
};

export function UserInput({ value, onChange, onSend, createRecognition }: Props) {
  const [listening, setListening] = React.useState(false);

  function toggleMic() {
    if (!createRecognition) return;
    if (listening) {
      (window as any)._recognition?.stop();
      setListening(false);
      return;
    }
    const rec = createRecognition();
    if (!rec) return;
    (window as any)._recognition = rec;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r || !r.isFinal) continue;
        const t = r[0]?.transcript?.trim();
        if (t) onChange(value ? value + " " + t : t);
      }
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          aria-label={listening ? "음성 입력 중지" : "음성 입력 시작"}
          aria-pressed={listening}
          variant="outline"
          onClick={toggleMic}
        >
          {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        {listening && <span className="text-xs text-emerald-600">듣는 중…</span>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          aria-label="메시지 입력"
          placeholder="메시지를 입력하세요"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(value);
            }
          }}
        />
        <Button aria-label="전송" onClick={() => onSend(value)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}





