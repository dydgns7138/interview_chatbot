/**
 * 직무(jobId)별 면접관 이미지 경로 목록.
 * Vercel 등 서버리스에서 fs 접근이 불안정할 수 있어, 실제 public/images 파일 기준으로 정적 맵 사용.
 */
const INTERVIEWER_IMAGES_BY_JOB: Record<string, string[]> = {
  "office-support": [
    "/images/interviewer_officer1.png",
    "/images/interviewer_officer2.jpg",
    "/images/interviewer_officer3.jpg",
    "/images/interviewer_officer4.jpg",
    "/images/interviewer_officer6.jpg",
  ],
  "assembly-packaging": [
    "/images/interviewer_manufacture1.png",
    "/images/interviewer_manufacture3.jpg",
    "/images/interviewer_manufacture4.jpg",
    "/images/interviewer_manufacture5.jpg",
    "/images/interviewer_manufacture6.jpg",
  ],
  "customer-service": [
    "/images/interviewer_service1.png",
    "/images/interviewer_service2.jpg",
    "/images/interviewer_service3.jpg",
    "/images/interviewer_service4.jpg",
    "/images/interviewer_service5.jpg",
  ],
  "environment-cleaning": [
    "/images/interviewer_cleaning1.png",
    "/images/interviewer_cleaning2.jpg",
    "/images/interviewer_cleaning4.jpg",
    "/images/interviewer_cleaning5.jpg",
    "/images/interviewer_cleaning6.jpg",
  ],
  "care-support": [
    "/images/interviewer_support1.png",
    "/images/interviewer_support2.jpg",
    "/images/interviewer_support3.jpg",
    "/images/interviewer_support4.jpg",
    "/images/interviewer_support5.jpg",
  ],
  "logistics": [
    "/images/interviewer_trainsportation1.png",
    "/images/interviewer_trainsportation2.jpg",
    "/images/interviewer_trainsportation3.jpg",
    "/images/interviewer_trainsportation4.jpg",
    "/images/interviewer_trainsportation5.jpg",
  ],
};

/**
 * jobId별 면접관 이미지 경로 배열을 반환합니다.
 * 로컬/배포 환경 모두에서 동일하게 동작하도록 정적 맵을 사용합니다.
 */
export function getInterviewerImageMap(): Record<string, string[]> {
  return { ...INTERVIEWER_IMAGES_BY_JOB };
}
