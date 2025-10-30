// 루트 레이아웃
// - 전역 스타일: `app/globals.css`
// - 기본 메타데이터 설정(제목/설명)
// - TTS/STT 전역 상태를 제공하는 `VoiceProvider`로 감쌈
// - 공용 `Header` 와 가운데 정렬된 `main` 컨테이너 렌더링
import type { Metadata } from "next";
import "./globals.css";
import { VoiceProvider } from "@/lib/state/voice-context";
import { TopNav } from "@/components/Layout/TopNav";

export const metadata: Metadata = {
  title: "면접 시뮬레이터",
  description: "GPT 기반 면접 교육 웹 앱",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <VoiceProvider>
          <TopNav />
          <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">{children}</main>
        </VoiceProvider>
      </body>
    </html>
  );
}


