// 한국어 i18n 딕셔너리 및 UI 문자열 모음
export const ko = {
  appTitle: "면접 시뮬레이터",
  globalVoiceOn: "음성 출력 켜짐",
  globalVoiceOff: "음성 출력 꺼짐",
  next: "다음",
  skip: "입력하지 않음",
  startInterview: "면접 시작",
  onboarding: {
    step: (current: number, total: number) => `${current}/${total}`,
    name: { title: "이름", desc: "당신의 이름을 알려주세요." },
    gender: { title: "성별", desc: "성별을 알려주세요." },
    age: { title: "나이", desc: "만 나이를 입력해주세요." },
    address: { title: "사는 곳", desc: "현재 거주지를 알려주세요." },
    desiredJob: { title: "희망 직종", desc: "희망하는 직종을 입력해주세요." },
    strengths: { title: "강점", desc: "본인의 강점을 말해 주세요." },
    weaknesses: { title: "약점", desc: "개선하고 싶은 약점을 말해 주세요." }
  },
  jobs: {
    title: "직무 선택",
    select: "선택",
  },
  chat: {
    placeholder: "메시지를 입력하거나 마이크로 말하세요...",
    send: "전송",
    listening: "인식 중...",
    retry: "재시도",
  },
  errors: {
    sttUnavailable: "이 브라우저에서는 음성 인식이 지원되지 않습니다.",
    sttDenied: "마이크 권한이 거부되었습니다.",
    ttsUnavailable: "이 브라우저에서는 음성 합성이 지원되지 않습니다.",
    apiKeyMissing: "서버 설정 오류: OPENAI_API_KEY가 누락되었습니다.",
  },
};


