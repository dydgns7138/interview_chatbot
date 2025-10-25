// 서버 액션: 온보딩 프로필과 선택 직무를 메모리에 저장
// 주의: 서버 재시작 시 데이터가 초기화됩니다. 지속 저장이 필요하면 DB로 교체하세요.
"use server";
import { Profile } from "@/types/profile";

let inMemoryProfile: Profile | null = null;
let inMemoryJobId: string | null = null;

export async function saveProfile(data: Profile) {
  inMemoryProfile = { ...inMemoryProfile, ...data };
  return inMemoryProfile;
}

export async function getProfile() {
  return inMemoryProfile;
}

export async function saveSelectedJob(jobId: string) {
  inMemoryJobId = jobId;
  return inMemoryJobId;
}

export async function getSelectedJob() {
  return inMemoryJobId;
}


