// 루트 경로(`/`)
// 접속 시 온보딩 페이지로 즉시 리다이렉트합니다.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/onboarding");
}


