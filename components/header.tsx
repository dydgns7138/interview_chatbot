// 앱 헤더
// - 온보딩으로 이동하는 앱 제목 표시
// - `useVoice` 를 통해 전역 TTS(음성 출력) 토글 제공
"use client";
import Link from "next/link";
import { useVoice } from "@/lib/state/voice-context";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { screenReaderEnabled, setScreenReaderEnabled } = useVoice();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/onboarding" className="text-lg font-semibold">
          면접 코치
        </Link>
        <div className="flex items-center gap-2">
          <Button
            aria-label={screenReaderEnabled ? "화면설명 끄기" : "화면설명 켜기"}
            variant="outline"
            size="sm"
            onClick={() => setScreenReaderEnabled(!screenReaderEnabled)}
          >
            {screenReaderEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">{screenReaderEnabled ? "화면설명 ON" : "화면설명 OFF"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}


