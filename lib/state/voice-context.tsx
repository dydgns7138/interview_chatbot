// 앱 전역에서 TTS(음성 출력)를 토글하기 위한 React 컨텍스트
"use client";
import React from "react";

type VoiceContextValue = {
  ttsEnabled: boolean;
  setTtsEnabled: (v: boolean) => void;
};

const VoiceContext = React.createContext<VoiceContextValue | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [ttsEnabled, setTtsEnabled] = React.useState<boolean>(true);

  return (
    <VoiceContext.Provider value={{ ttsEnabled, setTtsEnabled }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = React.useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within VoiceProvider");
  return ctx;
}


