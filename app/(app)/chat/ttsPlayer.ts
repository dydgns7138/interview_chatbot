// OpenAI TTS 재생 큐 관리
// - 순차 재생을 위한 큐 시스템
// - 실패 시에도 텍스트 면접은 정상 진행

type QueueItem = {
  text: string;
  role: string | null;
};

class TTSPlayer {
  private queue: QueueItem[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private listeners: Set<() => void> = new Set();

  // 상태 변경 리스너 등록
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 상태 변경 알림
  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // 큐에 추가
  enqueue(text: string, role: string | null) {
    if (!text.trim()) return;
    this.queue.push({ text: text.trim(), role });
    this.notify();
    this.processQueue();
  }

  // 큐 처리 (재귀적으로 순차 재생)
  private async processQueue() {
    if (this.isPlaying || this.queue.length === 0) return;

    this.isPlaying = true;
    this.notify();

    const item = this.queue.shift();
    if (!item) {
      this.isPlaying = false;
      this.notify();
      return;
    }

    try {
      await this.playAudio(item.text, item.role);
    } catch (error) {
      console.error("[TTSPlayer] Playback error:", error);
      // 에러 발생해도 큐는 계속 진행
    } finally {
      this.isPlaying = false;
      this.notify();
      // 다음 항목 처리
      this.processQueue();
    }
  }

  // 오디오 재생
  private async playAudio(text: string, role: string | null): Promise<void> {
    return new Promise((resolve, reject) => {
      // TTS API 호출
      fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, role }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.detail || `TTS API error: ${res.status}`);
          }
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);

          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };

          audio.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error("Audio playback failed"));
          };

          this.currentAudio = audio;
          audio.play().catch((e) => {
            URL.revokeObjectURL(url);
            reject(e);
          });
        })
        .catch((error) => {
          console.error("[TTSPlayer] Fetch error:", error);
          reject(error);
        });
    });
  }

  // 현재 재생 중지
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.queue = [];
    this.isPlaying = false;
    this.notify();
  }

  // 상태 조회
  getState() {
    return {
      isSpeaking: this.isPlaying,
      queueLength: this.queue.length,
    };
  }
}

// 싱글톤 인스턴스
export const ttsPlayer = new TTSPlayer();
