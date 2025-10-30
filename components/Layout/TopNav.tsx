"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { steps } from "@/lib/navigation";
import { useVoice } from "@/lib/state/voice-context";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const pathname = usePathname();
  const { ttsEnabled, setTtsEnabled } = useVoice();
  
  return (
    <>
      {/* Top header with title and voice toggle */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/onboarding" className="text-lg font-semibold">
            면접 시뮬레이터
          </Link>
          <div className="flex items-center gap-2">
            <Button
              aria-label={ttsEnabled ? "음성 출력 끄기" : "음성 출력 켜기"}
              variant="outline"
              size="sm"
              onClick={() => setTtsEnabled(!ttsEnabled)}
            >
              {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">{ttsEnabled ? "음성 ON" : "음성 OFF"}</span>
            </Button>
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






