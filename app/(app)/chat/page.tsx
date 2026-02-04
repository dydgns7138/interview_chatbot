import { getInterviewerImageMap } from "@/lib/interviewer-images";
import ChatPageClient from "./ChatPageClient";

/**
 * 서버 컴포넌트: public/images에서 interviewer_* 파일 목록을 읽어
 * jobId별 이미지 경로 배열을 만들고, 클라이언트에 props로 전달합니다.
 */
export default async function ChatPage() {
  const interviewerMap = getInterviewerImageMap();
  return <ChatPageClient interviewerMap={interviewerMap} />;
}
