// 앱 전역에서 음성 관련 상태를 관리하는 React 컨텍스트
"use client";
import React from "react";

type VoiceContextValue = {
  // 화면설명 (Screen Reader): 기본정보/직무선택/면접 탭의 안내 문구 읽기
  screenReaderEnabled: boolean;
  setScreenReaderEnabled: (v: boolean) => void;
  // 면접 음성 (Interview TTS): 면접 탭에서만 사용하는 면접관 질문 음성
  interviewVoiceEnabled: boolean;
  setInterviewVoiceEnabled: (v: boolean) => void;
};

const VoiceContext = React.createContext<VoiceContextValue | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [screenReaderEnabled, setScreenReaderEnabled] = React.useState<boolean>(false);
  const [interviewVoiceEnabled, setInterviewVoiceEnabled] = React.useState<boolean>(true);

  return (
    <VoiceContext.Provider value={{ 
      screenReaderEnabled, 
      setScreenReaderEnabled,
      interviewVoiceEnabled,
      setInterviewVoiceEnabled,
    }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = React.useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within VoiceProvider");
  return ctx;
}


