export const steps = [
  { key: "onboarding", label: "기본 정보", href: "/onboarding" },
  { key: "resume", label: "이력서", href: "/resume" },
  { key: "jobs", label: "직무 선택", href: "/jobs" },
  { key: "chat", label: "면접", href: "/chat" },
] as const;

export type StepKey = typeof steps[number]["key"];

export function isActive(href: string, pathname: string) {
  return href === pathname;
}











