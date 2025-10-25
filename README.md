# AI 면접 교육 챗봇

직무별 맞춤형 AI 면접 교육 플랫폼입니다.

## 🎯 주요 기능

- **6종류 직무별 특화 면접**: 사무지원, 포장조립, 고객서비스, 환경청소, 생활지원, 물류운송
- **실시간 음성 인식**: 음성으로 답변 입력 가능
- **텍스트 음성 변환**: 면접관의 질문을 음성으로 들을 수 있음
- **타이핑 효과**: 자연스러운 대화 경험
- **맞춤형 피드백**: 직무별 특성에 맞는 조언 제공

## 🚀 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4o-mini
- **Voice**: Web Speech API
- **Deployment**: Vercel

## 📦 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/your-username/gpt-interview-coach.git
cd gpt-interview-coach
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:3000 으로 접속하세요.

## 🌐 배포

### Vercel 배포 (추천)
1. [Vercel](https://vercel.com) 계정 생성
2. GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포 완료

### 다른 플랫폼
- **Netlify**: 무료 호스팅
- **Railway**: 무료 티어 제공
- **Render**: 무료 호스팅

## 🎨 직무별 챗봇 특성

### 사무지원
- 문서 정리 및 관리 능력 중시
- 컴퓨터 활용 능력 평가
- 꼼꼼함과 책임감 강조

### 포장조립
- 손재주와 정확성 평가
- 안전 의식과 규칙 준수
- 품질 관리 능력 중시

### 고객 서비스
- 고객 응대 능력과 친절함
- 문제 해결 능력 평가
- 서비스 마인드 중시

### 환경 및 청소
- 청결에 대한 인식과 책임감
- 안전 규칙 준수
- 체력과 지구력 평가

### 생활 지원 서비스
- 배려심과 공감 능력
- 책임감과 신뢰성
- 인내심과 끈기 평가

### 물류 운송 보조
- 체력과 지구력 평가
- 안전 의식과 규칙 준수
- 정확성과 신속성 중시

## 📝 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.