"use client";
import Image from "next/image";

type Props = { text?: string };

export function Interviewer({ text }: Props) {
  return (
    <div className="flex items-start gap-3">
      <Image
        src="/interviewer.svg"
        alt="면접관 일러스트, 중립적인 표정으로 대화를 나누는 모습"
        width={56}
        height={56}
        className="h-14 w-14 rounded-full ring-1 ring-slate-200"
      />
      <div className="bubble bubble-assistant max-w-prose">
        <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">{text}</p>
      </div>
    </div>
  );
}





