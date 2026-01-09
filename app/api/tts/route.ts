// OpenAI TTS API 라우트
// - 직무(role)에 따라 다른 voice로 텍스트를 음성으로 변환
// - mp3 형식으로 반환
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

// 직무별 voice 매핑
const VOICE_MAP: Record<string, "alloy" | "ash" | "cedar" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | "sage"> = {
  "office-support": "ash",
  "customer-service": "nova",
  "assembly-packaging": "cedar",
  "care-support": "shimmer",
  "logistics": "onyx",
  "environment-cleaning": "sage",
};

const DEFAULT_VOICE: "alloy" = "alloy";

// 요청 바디 스키마
const BodySchema = z.object({
  text: z.string().min(1).max(1500),
  role: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY missing", detail: "서버 환경변수에 OPENAI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 요청 바디 파싱 및 검증
    let body: z.infer<typeof BodySchema>;
    try {
      body = BodySchema.parse(await req.json());
    } catch (error) {
      return Response.json(
        { error: "Invalid request", detail: "text는 1자 이상 1500자 이하여야 합니다." },
        { status: 400 }
      );
    }

    // role에 따른 voice 선택
    const voice: "alloy" | "ash" | "cedar" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | "sage" = 
      (body.role && VOICE_MAP[body.role])
        ? VOICE_MAP[body.role]!
        : DEFAULT_VOICE;

    // OpenAI TTS 호출
    const openai = new OpenAI({ apiKey });
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: body.text,
    });

    // mp3 바이너리를 Buffer로 변환
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // audio/mpeg로 응답
    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[TTS API] Error:", error);
    return Response.json(
      {
        error: "TTS generation failed",
        detail: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
