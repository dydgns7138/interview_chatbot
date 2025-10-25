"use client";
import Link from "next/link";
import { steps, StepKey } from "@/lib/navigation";

type Props = { current?: StepKey };

export function Stepper({ current }: Props) {
  return (
    <ol className="flex flex-wrap items-center gap-3 text-sm">
      {steps.map((s, i) => {
        const active = current === s.key;
        return (
          <li key={s.key} className="flex items-center gap-3">
            <Link
              href={s.href}
              className={
                "rounded-md px-2.5 py-1.5 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600/70 " +
                (active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200")
              }
              aria-current={active ? "step" : undefined}
            >
              {i + 1}. {s.label}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}





