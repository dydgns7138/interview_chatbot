"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { steps } from "@/lib/navigation";
import { useVoice } from "@/lib/state/voice-context";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";

type TabClickHandler = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => void;

const TabClickContext = React.createContext<TabClickHandler | null>(null);

export function useTabClick() {
  return React.useContext(TabClickContext);
}

export function TabClickProvider({ children, onTabClick }: { children: React.ReactNode; onTabClick?: TabClickHandler }) {
  return (
    <TabClickContext.Provider value={onTabClick || null}>
      {children}
    </TabClickContext.Provider>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { screenReaderEnabled, setScreenReaderEnabled } = useVoice();
  const onTabClick = useTabClick();
  
  const handleLinkClick = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    // 기본정보 탭에서 다른 탭으로 이동할 때만 가로채기
    if (pathname === "/onboarding" && href !== "/onboarding") {
      // 항상 preventDefault를 먼저 실행하여 기본 네비게이션 막기
      e.preventDefault();
      e.stopPropagation();
      
      const handler = (window as any).__onboardingTabClickHandler;
      if (handler) {
        handler(href, e);
      } else {
        // 핸들러가 없으면 기본 동작 (일반적인 경우는 아님)
        window.location.href = href;
      }
    }
    // 이력서 탭에서는 누락 확인 모달 없이 바로 이동 (기본 Link 동작 사용)
  };
  
  return (
    <>
      {/* Top header with title and voice toggle */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/onboarding" className="text-lg font-semibold">
            면접 시뮬레이터
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Button
                aria-label={screenReaderEnabled ? "화면설명 끄기" : "화면설명 켜기"}
                variant="outline"
                size="sm"
                onClick={() => setScreenReaderEnabled(!screenReaderEnabled)}
                className={`${
                  screenReaderEnabled 
                    ? "bg-pink-50 border-pink-300 text-pink-700 hover:bg-pink-100" 
                    : "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"
                } font-medium shadow-sm`}
              >
                {screenReaderEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">{screenReaderEnabled ? "화면설명 ON" : "화면설명 OFF"}</span>
              </Button>
              {/* 커스텀 툴팁 - title 속성 제거로 중복 방지 */}
              <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                현재 화면에 대한 설명을 음성으로 들을 수 있습니다
                <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 rotate-45"></div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Step navigation */}
      <nav className="sticky top-[73px] z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-3">
          <div className="flex items-center gap-1 text-sm">
            {steps.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                onClick={(e) => handleLinkClick(s.href, e)}
                className={
                  "rounded-md px-3 py-1.5 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600/70 " +
                  (pathname === s.href
                    ? "bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")
                }
                aria-current={pathname === s.href ? "page" : undefined}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}






