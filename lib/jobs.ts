// 온보딩/직무 선택 단계에서 표시되는 직무 목록(정적 데이터)
import { Job } from "@/types/job";

export const JOBS: Job[] = [
  {
    id: "office-support",
    title: "사무지원",
    image: "/jobs/office.svg",
    subroles: ["자료정리", "문서스캔", "간단입력"],
    environments: ["사무실"],
    definition: "사무 환경에서 문서 및 데이터 정리, 기본 업무를 지원합니다.",
    responsibilities: [
      "문서 분류 및 정리",
      "스캔 및 복사",
      "데이터 입력 보조",
    ],
  },
  {
    id: "assembly-packaging",
    title: "포장조립",
    image: "/jobs/assembly.svg",
    subroles: ["부품조립", "포장", "검수"],
    environments: ["공장", "현장"],
    definition: "단순 조립 및 포장 작업을 통해 제품 생산을 지원합니다.",
    responsibilities: ["부품 조립", "완제품 포장", "제품 상태 확인"],
  },
  {
    id: "customer-service",
    title: "고객 서비스",
    image: "/jobs/cs.svg",
    subroles: ["안내", "응대", "간단상담"],
    environments: ["매장", "콜센터"],
    definition: "고객 응대와 안내를 통해 서비스 품질을 향상합니다.",
    responsibilities: ["고객 문의 응대", "상품/서비스 안내", "기본 상담"],
  },
  {
    id: "environment-cleaning",
    title: "환경 및 청소",
    image: "/jobs/cleaning.svg",
    subroles: ["사무실청소", "시설관리", "정리정돈"],
    environments: ["사무실", "현장"],
    definition: "사업장 내 청결과 안전한 환경 유지를 담당합니다.",
    responsibilities: ["바닥/책상 청소", "분리수거", "소독 작업"],
  },
  {
    id: "care-support",
    title: "생활 지원 서비스",
    image: "/jobs/care.svg",
    subroles: ["돌봄보조", "활동지원", "안내"],
    environments: ["시설", "가정"],
    definition: "일상 생활 보조 및 안내 등의 서비스를 제공합니다.",
    responsibilities: ["이동 보조", "간단한 안내", "생활 지원"],
  },
  {
    id: "logistics",
    title: "물류 운송 보조",
    image: "/jobs/logistics.svg",
    subroles: ["상하차보조", "피킹", "분류"],
    environments: ["창고", "물류센터"],
    definition: "물류 창고에서 상품 이동, 분류, 적재를 지원합니다.",
    responsibilities: ["상품 피킹", "분류 및 적재", "라벨 부착"],
  },
];


