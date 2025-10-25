"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { steps } from "@/lib/navigation";

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/onboarding" className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          면접 코치
        </Link>
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
  );
}





