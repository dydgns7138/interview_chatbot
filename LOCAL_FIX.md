# 로컬호스트가 안 될 때 (빈 화면 / CSS 깨짐 / Server Error)

## 1. 개발 서버 완전히 끄기
- **Cursor 또는 터미널**에서 `npm run dev` 가 켜져 있는 창을 찾습니다.
- 그 창에서 **Ctrl+C** 를 눌러 서버를 종료합니다.
- 다른 터미널이나 Cursor 터미널에서도 `node` / `next` 가 실행 중이면 모두 종료합니다.

## 2. 캐시 삭제
프로젝트 폴더(`c:\Users\dydgn\Dropbox\cursor`)에서 **새 터미널**을 열고:

```bash
npm run clean
```

`EBUSY` (사용 중) 오류가 나오면:
- **파일 탐색기**에서 `c:\Users\dydgn\Dropbox\cursor\.next` 폴더를 **직접 삭제**해 보세요.
- 그래도 안 지워지면 Cursor를 **완전히 종료**한 뒤 다시 `.next` 폴더를 삭제합니다.

## 3. 개발 서버 다시 실행
```bash
npm run dev
```

브라우저에서 **http://localhost:3000** 접속 후 **Ctrl+Shift+R** (강력 새로고침) 합니다.

## 4. 그래도 안 되면
- **Node 버전**: `node -v` → 18.x 이상 권장
- **의존성 재설치**:
  ```bash
  rmdir /s /q node_modules
  del package-lock.json
  npm install
  npm run dev
  ```
